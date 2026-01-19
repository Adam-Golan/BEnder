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

// Extend IHandler for internal use to allow async returns
type AsyncHeader = (req: IFrameworkRequest, res: IFrameworkResponse, next?: () => Promise<void>) => void | Promise<void>;

export class UniversalAdapter {
    [method: string]: ((path: string, ...handlers: IHandler[]) => void) | Promise<any> | any;

    public reqDigest: (req: any) => Promise<IFrameworkRequest> = async (req: IFrameworkRequest) => req;
    public resDigest: (res: any) => IFrameworkResponse = (res: IFrameworkResponse) => res;
    public use: (path: string | IHandler, ...handlers: IHandler[]) => void = () => null;
    public injectRouter: (path: string, router: any) => void = () => null;
    public createRouter: (path?: string) => Promise<UniversalAdapter> = async () => this;

    // Core references
    private routerModule: Promise<any> | null = null;
    private routingMethods: HttpMethod[] = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

    constructor(public app: any, private framework: NodeFrameworkType | BunFrameworkType) {
        if (!app || !framework) throw new Error('App and Framework must be defined');
        if (!["express", "fastify", "koa", "hono", "elysia"].find((f) => f === framework)) throw new Error('Framework is not supported');
        this.initializeAdapters();
        this.bindMethods();
    }

    private initializeAdapters() {
        let handleHandler = (handler: IHandler | AsyncHeader): ((...args: any[]) => void) => async (req: IFrameworkRequest, res: any, next?: () => Promise<any>) => {
            return handler(await this.reqDigest(req), this.resDigest(res), next);
        };

        if (this.framework === 'express') {
            this.resDigest = (res: IExpressResponse) => res;
            this.use = (path, ...handlers) => handlers.forEach(handler => this.app.use(path, handleHandler(handler)));
            this.routerModule = import('express').then(({ Router }) => Router);
            this.injectRouter = (path, router) => this.app.use(path, router.native);
            this.createRouter = async () => {
                const Router = await this.routerModule;
                return new UniversalAdapter(Router(), this.framework);
            };
        }

        if (this.framework === 'fastify') {
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
            this.use = (path, ...handlers) => (typeof path === 'string' ? handlers : [path, ...handlers]).forEach(handler => this.app.addHook('onRequest', handleHandler(handler)));
            this.routerModule = import('fastify').then(({ fastify }) => fastify);
            this.injectRouter = (path, router) => this.app.register(router.native, { prefix: path });
            this.createRouter = async () => {
                const fastify = await this.routerModule;
                return new UniversalAdapter(fastify(), this.framework);
            };
        }

        if (this.framework === 'koa') {
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
            this.use = (path, ...handlers) => (typeof path === 'string' ? handlers : [path, ...handlers]).forEach(handler => this.app.use(handleHandler(handler)));
            this.routerModule = import('@koa/router').then(({ Router }) => Router);
            this.injectRouter = (_, router) => this.app.use(router.native.routes());
            this.createRouter = async (path) => {
                const Router = await this.routerModule;
                return new UniversalAdapter(new Router({ prefix: path }), this.framework);
            };
        }

        if (this.framework === 'hono') {
            this.reqDigest = async (req: IHonoRequest) => ({ headers: req.headers(), query: req.query(), params: req.params(), body: await req.parseBody().catch(() => ({})) });
            this.resDigest = (res: IHonoResponse) => {
                const response: IFrameworkResponse = {
                    cookie: (key, value) => {
                        import('hono/cookie').then(({ setCookie }) => setCookie(res as any, key, value));
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
                    ? handlers.forEach(handler => this.app.use(path, handleHandler(handler)))
                    : [path, ...handlers].forEach(handler => this.app.use("*", handleHandler(handler)));
            };
            this.routerModule = import('hono').then(({ Hono }) => Hono);
            this.injectRouter = (path, router) => this.app.route(path, router.native);
            this.createRouter = async () => {
                const Hono = await this.routerModule;
                return new UniversalAdapter(new Hono(), this.framework);
            }
        }

        if (this.framework === 'elysia') {
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
            this.use = (path, ...handlers) => (typeof path === 'string' ? handlers : [path, ...handlers]).forEach(handler => this.app.onBeforeHandle(handleHandler(handler)));
            this.routerModule = import('elysia').then(({ Elysia }) => Elysia);
            this.injectRouter = (_, router) => this.app.use(router.native);
            this.createRouter = async (path) => {
                const Elysia = await this.routerModule;
                return new UniversalAdapter(new Elysia({ prefix: path }), this.framework);
            }
        }

        // Bind HTTP methods
        for (const method of this.routingMethods)
            this[method] = (path: string, ...handlers: IHandler[]) => {
                for (const handler of handlers) this.app[method](path, handleHandler(handler));
            }
    }

    private bindMethods() {
        // Ensure all methods are bound to this instance
        this.use = this.use.bind(this);
        this.injectRouter = this.injectRouter.bind(this);
        this.createRouter = this.createRouter.bind(this);
        for (const method of this.routingMethods)
            if (typeof this[method] === 'function') this[method] = (this[method] as Function).bind(this);
    }
}
