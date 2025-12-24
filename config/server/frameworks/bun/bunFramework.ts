import { join } from "path";
import { BunFrameworkType, IMetadata, IRequest, IResponse } from "../../types";
import { BaseFramework } from "../Base";

export class BunFramework extends BaseFramework<BunFrameworkType> {
    public metadata: Partial<IMetadata<BunFrameworkType>> = { runtime: 'bun' };
    protected routerRef: any;
    protected staticDir: string = join(__dirname, '../../../../public');
    protected usageKey: string = '';
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
        this.metadata.server = await this.createRouter();
        // @ts-ignore
        this.routerRef = (await import(this.metadata.framework))[this.metadata.framework === 'hono' ? 'Hono' : 'Elysia']
        // Hono uses 'use'. Elysia uses 'use'.
        this.usageKey = 'use';
        await super.setupMiddleware();
        return this;
    }

    public async createRouter(): Promise<any> {
        const app = new this.routerRef();

        // Hono doesn't expose .head() directly, verify and polyfill
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
        // Polyfill .use to support .use(path, subApp) mapping to .route(path, subApp) -> Hono
        // Polyfill .use mapping to .group -> Elysia
        const originalUse = app.use.bind(app);
        app.use = (arg1: any, arg2: any) => this.metadata.framework === 'hono'
            ? typeof arg1 === 'string' && arg2 && typeof arg2.fetch === 'function' ? app.route(arg1, arg2) : originalUse(arg1, arg2)
            : typeof arg1 === 'string' && arg2 ? app.group(arg1, (g: any) => g.use(arg2)) : originalUse(arg1)

        return app;
    }

    public listen(port: number, callback?: () => void): void {
        if (!this.metadata.server) throw new Error('Server not initialized');
        if (this.metadata.framework === 'hono') {
            // @ts-ignore
            Bun.serve({
                fetch: this.metadata.server.fetch,
                port: port
            });
        } else this.metadata.server.listen(port);
        callback?.();
    }

    protected async addStaticFiles(): Promise<void> {
        const staticMiddleware = await import(this.middlewares.static[this.metadata.framework!]);
        this.metadata.framework === 'hono'
            ? this.metadata.server.use('/*', staticMiddleware.serveStatic({ root: this.staticDir }))
            : this.metadata.server.use(staticMiddleware.default({ assets: this.staticDir }));
    }
}