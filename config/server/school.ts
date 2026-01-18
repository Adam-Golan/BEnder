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

export class UniversalAdapter {
    [method: string]: ((path: string, ...handlers: IHandler[]) => void) | Promise<any> | null;
    reqDigest: (req: any) => Promise<IFrameworkRequest> = async (req: IFrameworkRequest) => req;
    resDigest: (res: any) => IFrameworkResponse = (res: IFrameworkResponse) => res;
    use: (path: string | IHandler, ...handlers: IHandler[]) => void = () => null;
    injectRouter: (path: string, router: any) => void = () => null;
    createRouter: (path?: string) => any = () => null;
    private routerModule: Promise<any> | null = null;

    constructor(app: any, framework: NodeFrameworkType | BunFrameworkType) {
        if (!app || !framework) throw new Error('App and Framework must be defined');
        if (!["express", "fastify", "koa", "hono", "elysia"].find((f) => f === framework)) throw new Error('Framework is not supported');

        const routingMethods: HttpMethod[] = ['use', 'get', 'post', 'put', 'delete', 'patch', 'head', 'options'];
        let handleHandler = (handler: IHandler): ((...args: any[]) => void) => async (req: IFrameworkRequest, res: any, next?: () => Promise<any>) => handler(await this.reqDigest(req), this.resDigest(res), next);

        if (framework === 'express') {
            this.resDigest = (res: IExpressResponse) => res;
            this.use = (path, ...handlers) => handlers.forEach(handler => app.use(path, handleHandler(handler)));
            this.routerModule = import('express').then(({ Router }) => Router);
            this.injectRouter = (path, router) => app.use(path, router);
            this.createRouter = async () => (await this.routerModule)();
        }
        if (framework === 'fastify') {
            this.resDigest = (res: IFastifyResponse) => {
                const response: IFrameworkResponse = {
                    set(key, value) {
                        res.header(key, value);
                        return response;
                    },
                    cookie(key, value) {
                        res.cookie(key, value);
                        return response;
                    },
                    status(code) {
                        res.code(code);
                        return response;
                    },
                    json: (data) => res.send(data),
                    redirect: (url) => res.redirect(url),
                }
                return response;
            };
            handleHandler = (handler: IHandler) => async (req: IFrameworkRequest, res: IFastifyResponse) => handler(await this.reqDigest(req), this.resDigest(res));
            this.use = (path, ...handlers) => (typeof path === 'string' ? handlers : [path, ...handlers]).forEach(handler => app.addHook('onRequest', handleHandler(handler)));
            this.routerModule = import('fastify').then(({ fastify }) => fastify);
            this.injectRouter = (path, router) => app.register(router, { prefix: path });
            this.createRouter = async () => (await this.routerModule)();
        }
        if (framework === 'koa') {
            this.resDigest = (res: IKoaResponse) => {
                const response: IFrameworkResponse = {
                    cookie(key, value) {
                        res.cookies.set(key, value);
                        return response;
                    },
                    set(key, value) {
                        res.set(key, value);
                        return response;
                    },
                    status(code) {
                        res.status = code;
                        return response;
                    },
                    json: (data) => res.body = JSON.stringify(data),
                    redirect: (url) => res.redirect(url),
                }
                return response;
            };
            handleHandler = (handler: IHandler) => async (ctx: { request: IFrameworkRequest, response: IKoaResponse }, next: () => Promise<any>) => handler(await this.reqDigest(ctx.request), await this.resDigest(ctx.response), next);
            this.use = (path, ...handlers) => (typeof path === 'string' ? handlers : [path, ...handlers]).forEach(handler => app.use(handleHandler(handler)));
            this.routerModule = import('@koa/router').then(({ Router }) => Router);
            this.injectRouter = (_, router) => app.use(router.routes());
            this.createRouter = async (path) => new (await this.routerModule)({ prefix: path });
        }
        if (framework === 'hono') {
            this.reqDigest = async (req: IHonoRequest) => ({ headers: req.headers(), query: req.query(), params: req.params(), body: await req.parseBody() });
            this.resDigest = (res: IHonoResponse) => {
                const response: IFrameworkResponse = {
                    cookie: (key, value) => {
                        import('hono/cookie').then(({ setCookie }) => setCookie(res as any, key, value));
                        return this.resDigest(res);
                    },
                    set(key, value) {
                        res.header(key, value);
                        return response;
                    },
                    status(code) {
                        res.status(code);
                        return response;
                    },
                    json: (data) => res.json(data),
                    redirect: (url) => res.redirect(url),
                }
                return response;
            };
            handleHandler = (handler: IHandler) => async (c: { req: IHonoRequest, res: IHonoResponse }) => handler(await this.reqDigest(c.req), await this.resDigest(c.res));
            this.use = (path, ...handlers) => {
                typeof path === 'string'
                    ? handlers.forEach(handler => app.use(path, handleHandler(handler)))
                    : [path, ...handlers].forEach(handler => app.use("*", handleHandler(handler)));
            };
            this.routerModule = import('hono').then(({ Hono }) => Hono);
            this.injectRouter = (path, router) => app.route(path, router);
            this.createRouter = async () => new (await this.routerModule)();
        }
        if (framework === 'elysia') {
            this.resDigest = (res: IElysiaResponse) => {
                const response: IFrameworkResponse = {
                    cookie(key, value) {
                        res.cookie[key] = import('elysia').then(({ Cookie }) => new Cookie(key, {}, { value })) as any;
                        return response;
                    },
                    set(key, value) {
                        res.headers[key] = value;
                        return response;
                    },
                    status(code) {
                        res.status(code);
                        return response;
                    },
                    json: (data) => res.body = JSON.stringify(data),
                    redirect: (url) => res.redirect(url),
                }
                return response;
            };
            handleHandler = (handler: IHandler) => async (ctx: IFrameworkRequest & IElysiaResponse) => handler(await this.reqDigest(ctx), await this.resDigest(ctx));
            this.use = (path, ...handlers) => (typeof path === 'string' ? handlers : [path, ...handlers]).forEach(handler => app.onBeforeHandle(handleHandler(handler)));
            this.routerModule = import('elysia').then(({ Elysia }) => Elysia);
            this.injectRouter = (_, router) => app.use(router);
            this.createRouter = async (path) => new (await this.routerModule)({ prefix: path });
        }
        setTimeout(() => routingMethods.forEach(method => this[method] = (path, ...handlers) => handlers.forEach(handler => app[method](path, handleHandler(handler)))));
    }
}