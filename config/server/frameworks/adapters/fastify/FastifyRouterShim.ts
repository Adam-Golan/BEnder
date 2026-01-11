import { IRequest, IResponse, HttpMethod, RouteHandler } from "../../../types";

export class FastifyRouterShim {
    private routes: { method: HttpMethod, path: string, handler: RouteHandler }[] = [];
    private mounts: { path: string, router: FastifyRouterShim }[] = [];
    public isFastifyRouterShim = true;

    constructor() {
        // Make the instance callable
        const dispatch = (async (req: any, reply: any) => {
            await this.handle(req, reply);
        }) as any;
        Object.assign(dispatch, this);
        return dispatch;
    }

    public use = (pathOrHandler: string | any, handlerOrRouter?: any) => {
        if (typeof pathOrHandler === 'string' && handlerOrRouter) {
            if (handlerOrRouter instanceof FastifyRouterShim || (handlerOrRouter as any).isFastifyRouterShim) {
                this.mounts.push({ path: pathOrHandler, router: handlerOrRouter });
            }
        }
    }

    public get = (path: string, handler: RouteHandler) => { this.add('get', path, handler); }
    public post = (path: string, handler: RouteHandler) => { this.add('post', path, handler); }
    public put = (path: string, handler: RouteHandler) => { this.add('put', path, handler); }
    public delete = (path: string, handler: RouteHandler) => { this.add('delete', path, handler); }
    public patch = (path: string, handler: RouteHandler) => { this.add('patch', path, handler); }
    public head = (path: string, handler: RouteHandler) => { this.add('head', path, handler); }
    public options = (path: string, handler: RouteHandler) => { this.add('options', path, handler); }

    private add = (method: HttpMethod, path: string, handler: RouteHandler) => {
        this.routes.push({ method, path, handler });
    }

    public handle = async (req: any, reply: any) => {
        const url = req.url || req.raw.url;

        // 1. Check Mounts
        for (const mount of this.mounts) {
            if (url.startsWith(mount.path)) {
                await mount.router.handle(req, reply);
                if (reply.sent) return;
            }
        }

        // 2. Check Routes
        for (const route of this.routes) {
            // Naive matching
            if (url.endsWith(route.path) || (route.path === '/' && !url.split('/').pop())) {
                const res = {
                    status: (code: number) => { reply.code(code); return res; },
                    json: (data: any) => reply.send(data),
                    send: (data: any) => reply.send(data),
                    type: (t: string) => { reply.type(t); return res; }
                };
                await route.handler(req, res);
                return;
            }
        }
    }

    // Used by FastifyAdapter to register this shim to the real instance
    public registerTo = (fastify: any, opts?: any) => {
        this.routes.forEach(r => {
            const path = r.path === '/' ? '' : r.path;
            fastify[r.method](path || '/', async (fastifyReq: any, fastifyReply: any) => {
                // Adapt Fastify (req, reply) to Express (req, res) signature
                const req = fastifyReq;
                const res = {
                    status: (code: number) => { fastifyReply.code(code); return res; },
                    json: (data: any) => fastifyReply.send(data),
                    send: (data: any) => fastifyReply.send(data),
                    type: (t: string) => { fastifyReply.type(t); return res; }
                };
                await r.handler(req, res);
            });
        });

        this.mounts.forEach(m => {
            fastify.register((instance: any, _: any, done: any) => {
                m.router.registerTo(instance);
                done();
            }, { prefix: m.path });
        });
    }
}
