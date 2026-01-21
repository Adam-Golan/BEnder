import {
    IFrameworkRequest,
    IFrameworkResponse,
    IHonoRequest,
    IHonoResponse,
    IExpressResponse,
    IFastifyResponse,
    IKoaResponse,
    IElysiaResponse,
    NodeFrameworkType,
    BunFrameworkType,
    IHandler,
    HttpMethod
} from './types';
import { join } from 'path';
import { appConfig } from '../../app.config';

// Extend IHandler for internal use to allow async returns
type AsyncHeader = (req: IFrameworkRequest, res: IFrameworkResponse, next?: () => Promise<void>) => void | Promise<void>;

export class UniversalAdapter {
    // Static Factory
    public static async init(framework?: NodeFrameworkType | BunFrameworkType): Promise<UniversalAdapter> {
        if (!framework) {
            if (UniversalAdapter.isInstalled('hono')) framework = 'hono';
            if (UniversalAdapter.isInstalled('elysia')) framework = 'elysia';
            if (UniversalAdapter.isInstalled('express')) framework = 'express';
            if (UniversalAdapter.isInstalled('fastify')) framework = 'fastify';
            if (UniversalAdapter.isInstalled('koa')) framework = 'koa';
            if (!framework) throw new Error('No supported framework found');
        }

        let app: any;
        switch (framework) {
            case 'express':
                // @ts-ignore
                app = (await import('express')).default();
                break;
            case 'fastify':
                // @ts-ignore
                app = (await import('fastify')).default({ exposeHeadRoutes: false, logger: true });
                break;
            case 'koa':
                // @ts-ignore
                app = new (await import('koa')).default();
                break;
            case 'hono':
                // @ts-ignore
                app = new (await import('hono')).Hono();
                break;
            case 'elysia':
                // @ts-ignore
                app = new (await import('elysia')).Elysia();
                break;
            default:
                throw new Error(`Unsupported framework: ${framework}`);
        }
        console.log(`[BEnder] Detected: ${framework} framework - Initiating`);
        const adapter = new UniversalAdapter(app, framework as any);
        console.log(`[BEnder] Framework: ${framework} - Initiated`);
        await adapter.initializeAdapters();
        console.log(`[BEnder] Framework: ${framework} - Installing pre configured middleware`);
        await adapter.setupMiddleware();
        console.log(`[BEnder] Framework: ${framework} - Pre configured middleware installed`);
        adapter.bindMethods();
        console.log(`[BEnder] Framework: ${framework} - Ready`);
        return adapter;
    }

    private static isInstalled(name: string): boolean {
        try { require.resolve(name); return true; } catch { return false; }
    }

    [method: string]: ((path: string, ...handlers: IHandler[]) => void) | Promise<any> | any;

    public reqDigest: (req: any) => Promise<IFrameworkRequest> = async (req: IFrameworkRequest) => req;
    public resDigest: (res: any) => IFrameworkResponse = (res: IFrameworkResponse) => res;
    public use: (path: string | typeof this.routerModule, ...handlers: typeof this.routerModule[]) => void = () => null;
    public createRouter: (path?: string) => typeof this.routerModule = () => this.routerModule();

    // Core references
    private routerModule: any | null = null;
    private routingMethods: HttpMethod[] = ['get', 'post', 'put', 'delete', 'patch', 'options'];

    // Native middleware registration
    public useNative: (middleware: any, options?: any) => void = () => null;

    constructor(private app: any, public type: NodeFrameworkType | BunFrameworkType) {
        if (!app || !type) throw new Error('App and Framework must be defined');
        if (!["express", "fastify", "koa", "hono", "elysia"].find((f) => f === type)) throw new Error('Framework is not supported');
    }

    private async initializeAdapters() {
        // 0. Define handler
        let handleHandler = (handler: IHandler | AsyncHeader): ((...args: any[]) => void) => async (req: IFrameworkRequest, res: any, next?: () => Promise<any>) => {
            return handler(await this.reqDigest(req), this.resDigest(res), next);
        };

        // 1. Default bindings (Generic for apps with .get/.post)
        for (const method of this.routingMethods)
            this[method] = (path: string, ...handlers: IHandler[]) => {
                for (const handler of handlers) this.app[method](path, handleHandler(handler));
                return this;
            }

        if (this.type === 'express') {
            this.resDigest = (res: IExpressResponse) => res;
            this.use = (path, ...handlers) => {
                typeof path === 'string'
                    ? handlers.forEach(handler => this.app.use(path, handleHandler(handler)))
                    : [path, ...handlers].forEach(handler => this.app.use(handleHandler(handler)));
            }
            this.useNative = (middleware) => this.app.use(middleware);
            // @ts-ignore
            this.routerModule = await import('express').then(({ Router }) => Router);
        }

        if (this.type === 'fastify') {
            this.resDigest = (res: IFastifyResponse) => {
                const response: IFrameworkResponse = {
                    set: (key, value) => { res.header(key, value); return response; },
                    cookie: (key, value) => { res.cookie(key, value); return response; },
                    status: (code) => { res.code(code); return response; },
                    json: (data) => res.send(data),
                    redirect: (url) => res.redirect(url),
                }
                return response;
            };
            handleHandler = (handler: IHandler | AsyncHeader) => async (req: IFrameworkRequest, res: IFastifyResponse) => {
                return handler(await this.reqDigest(req), this.resDigest(res));
            };
            this.use = (path, ...handlers) => {
                typeof path === 'string'
                    ? handlers.forEach(handler => this.app.register(handleHandler(handler), { prefix: path }))
                    : [path, ...handlers].forEach(handler => this.app.addHook('onRequest', handleHandler(handler)));
            }
            this.useNative = (plugin, options) => this.app.register(plugin, options);
            // @ts-ignore
            this.routerModule = await import('fastify').then(({ fastify }) => fastify);
        }

        if (this.type === 'koa') {
            this.resDigest = (res: IKoaResponse) => {
                const response: IFrameworkResponse = {
                    cookie: (key, value) => { res.cookies.set(key, value); return response; },
                    set: (key, value) => { res.set(key, value); return response; },
                    status: (code) => { res.status = code; return response; },
                    json: (data) => res.body = data, // Auto-JSON stringify by Koa
                    redirect: (url) => res.redirect(url),
                }
                return response;
            };
            handleHandler = (handler: IHandler | AsyncHeader) => async (ctx: { request: IFrameworkRequest, response: IKoaResponse }, next: () => Promise<any>) => {
                return handler(await this.reqDigest(ctx.request), this.resDigest(ctx.response), next);
            };
            this.use = (path, ...handlers) => {
                typeof path === 'string'
                    ? handlers.forEach(handler => this.app.use(handleHandler(handler)))
                    : [path, ...handlers].forEach(handler => this.app.use(handleHandler(handler)));
            }
            this.useNative = (middleware) => this.app.use(middleware);
            // @ts-ignore
            this.routerModule = await import('@koa/router').then(({ Router }) => Router);
            this.createRouter = (path) => new this.routerModule({ prefix: path });
        }

        if (this.type === 'hono') {
            this.reqDigest = async (req: IHonoRequest) => ({ headers: req.header(), query: req.query(), params: req.param(), body: await req.parseBody().catch(() => ({})) });
            this.resDigest = (res: any) => {
                const response: IFrameworkResponse = {
                    cookie: (key, value) => {
                        // @ts-ignore
                        import('hono/cookie').then(({ setCookie }) => setCookie(res, key, value));
                        return response;
                    },
                    set: (key, value) => { res.header(key, value); return response; },
                    status: (code) => { res.status(code); return response; },
                    json: (data) => res.json(data),
                    redirect: (url) => res.redirect(url),
                }
                return response;
            };
            handleHandler = (handler: IHandler | AsyncHeader) => async (c: { req: IHonoRequest, res: IHonoResponse }) => {
                return handler(await this.reqDigest(c.req), this.resDigest(c.res));
            };
            this.use = (path, ...handlers) => {
                typeof path === 'string'
                    ? handlers.forEach(handler => this.app[handler instanceof this.routerModule ? 'route' : 'use'](path, handleHandler(handler)))
                    : [path, ...handlers].forEach(handler => this.app.use("*", handleHandler(handler)));
            };
            this.useNative = (middleware) => this.app.use('*', middleware);
            // @ts-ignore
            this.routerModule = await import('hono').then(({ Hono }) => Hono);
            this.createRouter = () => new this.routerModule();
        }

        if (this.type === 'elysia') {
            this.resDigest = (res: IElysiaResponse) => {
                const response: IFrameworkResponse = {
                    cookie: (key, value) => {
                        // @ts-ignore
                        res.cookie[key].value = value;
                        return response;
                    },
                    set: (key, value) => { res.headers[key] = value; return response; },
                    status: (code) => { res.status(code); return response; },
                    json: (data) => { res.body = data; }, // Elysia handles serialization
                    redirect: (url) => res.redirect(url),
                }
                return response;
            };
            handleHandler = (handler: IHandler | AsyncHeader) => async (ctx: IFrameworkRequest & IElysiaResponse) => {
                return handler(await this.reqDigest(ctx), this.resDigest(ctx));
            };
            this.use = (path, ...handlers) => {
                typeof path === 'string'
                    ? handlers.forEach(handler => this.app.use(path, handleHandler(handler)))
                    : [path, ...handlers].forEach(handler => this.app.use(handleHandler(handler)));
            }
            this.useNative = (middleware) => this.app.use(middleware);
            // @ts-ignore
            this.routerModule = await import('elysia').then(({ Elysia }) => Elysia);
            this.createRouter = (path) => new this.routerModule({ prefix: path });
        }
    }

    public bindMethods() {
        // Ensure all methods are bound to this instance
        this.use = this.use.bind(this);
        this.createRouter = this.createRouter.bind(this);
        for (const method of this.routingMethods)
            if (typeof this[method] === 'function') this[method] = (this[method] as Function).bind(this);
    }

    public async listen(port: number, cb?: () => void): Promise<void> {
        if (this.type === 'hono') {
            // @ts-ignore
            if (typeof Bun !== 'undefined') Bun.serve({ fetch: this.app.fetch.bind(this.app), port });
            // @ts-ignore
            else (await import('@hono/node-server')).serve({ fetch: this.app.fetch, port }, cb);
        }
        if (this.type === 'elysia') {
            // @ts-ignore
            if (typeof Bun !== 'undefined') this.app.listen(port);
            // @ts-ignore
            else (await import('@elysiajs/node')).default(this.app).listen(port, cb);
        }
        if (this.type === 'fastify') this.app.listen({ port }, cb);
        // Express, Koa
        if (this.type === 'express' || this.type === 'koa') this.app.listen(port, cb);
    }

    public async setupMiddleware() {
        // Static Files
        const staticDir = join(__dirname, '../../public');
        if (this.type === 'express') {
            // @ts-ignore
            const express = (await import('express')).default;
            // @ts-ignore
            this.useNative(express.static(staticDir));
        }
        if (this.type === 'koa') {
            // @ts-ignore
            const koaStatic = await import('koa-static');
            // @ts-ignore
            this.useNative((koaStatic.default || koaStatic)(staticDir));
        }
        if (this.type === 'fastify') {
            // @ts-ignore
            this.useNative((await import('@fastify/static')).default, { root: staticDir });
        }
        if (this.type === 'hono') {
            // @ts-ignore
            const serveStatic = typeof Bun !== 'undefined' ? (await import('hono/bun')).serveStatic : (await import('@hono/node-server/serve-static')).serveStatic;
            this.useNative('/*', serveStatic({ root: staticDir }));
        }

        console.log(`[BEnder] Framework: ${this.type} - Static folder ready 🟢`);

        // Parsers
        if (this.type === 'express') {
            // @ts-ignore
            const express = (await import('express')).default;
            this.useNative(express.json());
            this.useNative(express.urlencoded({ extended: true }));
        }
        // @ts-ignore
        if (this.type === 'koa') this.useNative((await import('koa-bodyparser') as any).default());
        console.log(`[BEnder] Framework: ${this.type} - Parsers ready 🟢`);
        // Fastify has built-in body parsing
        // Hono/Elysia have built-in body parsing

        // Security & Utils (from appConfig)
        if (appConfig.security.cors) await this.addCors();
        if (appConfig.security.helmet) await this.addHelmet();
        if (appConfig.security.rateLimit) await this.addRateLimit();
        await this.addMorgan();
        await this.addCookieParser();
    }

    private async addCors() {
        try {
            // @ts-ignore
            if (this.type === 'express') this.useNative((await import('cors')).default(appConfig.security.cors));
            // @ts-ignore
            if (this.type === 'koa') this.useNative((await import('@koa/cors')).default(appConfig.security.cors));
            // @ts-ignore
            if (this.type === 'fastify') this.useNative((await import('@fastify/cors')).default, appConfig.security.cors);
            // @ts-ignore
            if (this.type === 'hono') this.useNative((await import('hono/cors')).cors(appConfig.security.cors));
            // @ts-ignore
            if (this.type === 'elysia') this.useNative((await import('@elysiajs/cors')).cors(appConfig.security.cors));
        } catch (e) { console.warn('CORS install failed', e); }
        console.log(`[BEnder] Framework: ${this.type} - CORS ready 🟢`);
    }

    private async addHelmet() {
        try {
            // @ts-ignore
            if (this.type === 'express') this.useNative((await import('helmet')).default(appConfig.security.helmet));
            // @ts-ignore
            if (this.type === 'koa') this.useNative((await import('koa-helmet')).default(appConfig.security.helmet));
            // @ts-ignore
            if (this.type === 'fastify') this.useNative((await import('@fastify/helmet')).default, appConfig.security.helmet);
            // @ts-ignore
            if (this.type === 'hono') this.useNative((await import('hono/secure-headers')).secureHeaders(appConfig.security.helmet));
            // @ts-ignore
            if (this.type === 'elysia') this.useNative((await import('@elysiajs/html')).html()); // Note: elysiajs/html is not exactly helmet
        } catch (e) { console.warn('Helmet install failed', e); }
        console.log(`[BEnder] Framework: ${this.type} - Helmet security ready 🟢`);
    }

    private async addRateLimit() {
        try {
            // @ts-ignore
            if (this.type === 'express') this.useNative((await import('express-rate-limit')).default(appConfig.security.rateLimit));
            // @ts-ignore
            if (this.type === 'koa') this.useNative((await import('koa-ratelimit')).default({ driver: 'memory', db: new Map(), ...appConfig.security.rateLimit }));
            // @ts-ignore
            if (this.type === 'fastify') this.useNative((await import('@fastify/rate-limit')).default, appConfig.security.rateLimit);
            // @ts-ignore
            if (this.type === 'hono') this.useNative((await import('hono-rate-limiter')).rateLimiter(appConfig.security.rateLimit));
            // Elysia limit?
        } catch (e) { console.warn('RateLimit install failed', e); }
        console.log(`[BEnder] Framework: ${this.type} - Rate limiting ready 🟢`);
    }

    private async addMorgan() {
        try {
            // @ts-ignore
            if (this.type === 'express') this.useNative((await import('morgan')).default('dev'));
            // @ts-ignore
            if (this.type === 'koa') this.useNative((await import('koa-morgan')).default('dev'));
            // Fastify has built-in logger, defaulting to dev
            // @ts-ignore
            if (this.type === 'hono') this.useNative((await import('hono/logger')).logger());
            // @ts-ignore
            if (this.type === 'elysia') this.useNative((await import('@elysiajs/logger')).logger());
        } catch (e) { console.warn('Morgan install failed', e); }
        console.log(`[BEnder] Framework: ${this.type} - Logging ready 🟢`);
    }

    private async addCookieParser() {
        try {
            // @ts-ignore
            if (this.type === 'express') this.useNative((await import('cookie-parser')).default());
            // Fastify: @fastify/cookie
            // @ts-ignore
            if (this.type === 'fastify') this.useNative((await import('@fastify/cookie')).default);
            // Koa has built-in or uses koa-body
            // Hono has built-in usually?
        } catch (e) { console.warn('CookieParser install failed', e); }
        console.log(`[BEnder] Framework: ${this.type} - Cookie parser ready 🟢`);
    }
}
