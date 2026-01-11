import { join } from "path";
import { BunFrameworkType, IMetadata, IRequest, IResponse } from "../types";
import { BaseFramework } from "./Base";

export class BunFramework extends BaseFramework<BunFrameworkType> {
    public metadata: Partial<IMetadata<BunFrameworkType>> = { runtime: 'bun' };
    protected routerRef: any;
    protected staticDir: string = join(__dirname, '../../../public');
    protected usageKey: string = '';

    // Extended middleware map for Hono/Elysia
    protected middlewares: Record<'cors' | 'cookieParser' | 'helmet' | 'morgan' | 'rateLimit' | 'static', Record<BunFrameworkType, string>> = {
        cors: { hono: 'hono/cors', elysia: '@elysiajs/cors' },
        cookieParser: { hono: 'hono/cookie', elysia: '@elysiajs/cookie' },
        helmet: { hono: 'hono/secure-headers', elysia: '@elysiajs/html' },
        morgan: { hono: 'hono/logger', elysia: '@elysiajs/logger' },
        rateLimit: { hono: 'hono-rate-limiter', elysia: '@elysiajs/limit' },
        static: { hono: 'hono/bun', elysia: '@elysiajs/static' }
    };

    public async init(): Promise<BaseFramework<BunFrameworkType>> {
        await super.init();
        // @ts-ignore
        this.routerRef = (await import(this.metadata.framework))[this.metadata.framework === 'hono' ? 'Hono' : 'Elysia']
        this.metadata.server = await this.createRouter();
        this.usageKey = 'use';
        await super.setupMiddleware();
        return this;
    }

    public async createRouter(): Promise<any> {
        const app = new this.routerRef();

        // Hono HEAD polyfill
        if (this.metadata.framework === 'hono' && !app.head && app.on) {
            app.head = function (path: string, handler: any) { return this.on('HEAD', path, handler); };
        }

        const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'] as const;
        const createResponse = (status: (code: number) => ReturnType<IResponse['status']>): IResponse => {
            const res = {
                status,
                json: (data: any) => data,
                send: (data: any) => data,
                type: () => res
            };
            return res;
        }

        const createRequest = (ctx: any, params: any): IRequest => ({ params, ...ctx });

        methods.forEach(method => {
            const original = app[method].bind(app);
            app[method] = (path: string, handler: any) => {
                return original(path, async (ctx: any) => {
                    let req = this.metadata.framework === 'hono' ? createRequest(ctx.req, ctx.req.param()) : createRequest(ctx.request, ctx.params);
                    let res = this.metadata.framework === 'hono'
                        ? createResponse((code: number) => ({ json: (data: any) => ctx.json(data, code), send: (data: any) => ctx.text(data, code) }))
                        : createResponse((code: number) => ({ json: (data: any) => { ctx.set.status = code; return data; }, send: (data: any) => { ctx.set.status = code; return data; } }));
                    return await handler(req, res);
                });
            }
        });

        // Polyfill .use
        const originalUse = app.use.bind(app);
        app.use = (arg1: any, arg2: any) => this.metadata.framework === 'hono'
            ? typeof arg1 === 'string' && arg2 && typeof arg2.fetch === 'function' ? app.route(arg1, arg2) : originalUse(arg1, arg2)
            : typeof arg1 === 'string' && arg2 ? app.group(arg1, (g: any) => g.use(arg2)) : originalUse(arg1)

        return app;
    }

    public async listen(port: number, callback?: () => void): Promise<void> {
        if (!this.metadata.server) throw new Error('Server not initialized');

        // Detect Runtime (Node vs Bun)
        // @ts-ignore
        const isBun = typeof Bun !== 'undefined';

        if (this.metadata.framework === 'hono') {
            if (isBun) {
                // @ts-ignore
                Bun.serve({
                    fetch: this.metadata.server.fetch,
                    port: port
                });
            } else {
                // Node Runtime: Requires @hono/node-server
                try {
                    // @ts-ignore
                    const { serve } = await import('@hono/node-server');
                    serve({ fetch: this.metadata.server.fetch, port }, callback);
                    return; // Callback handled by serve?
                } catch (e) {
                    console.error("Hono on Node requires '@hono/node-server'. Please install it.");
                    throw e;
                }
            }
        } else {
            // Elysia
            this.metadata.server.listen(port);
        }
        callback?.();
    }

    protected async addStaticFiles(): Promise<void> {
        if (this.metadata.framework === 'hono') {
            // @ts-ignore
            const isBun = typeof Bun !== 'undefined';
            if (isBun) {
                // @ts-ignore
                const { serveStatic } = await import('hono/bun');
                this.metadata.server.use('/*', serveStatic({ root: this.staticDir }));
            } else {
                // @ts-ignore
                const { serveStatic } = await import('@hono/node-server/serve-static');
                this.metadata.server.use('/*', serveStatic({ root: this.staticDir }));
            }
        } else {
            const staticMiddleware = await import(this.middlewares.static[this.metadata.framework!]);
            this.metadata.server.use(staticMiddleware.default({ assets: this.staticDir }));
        }
    }
}
