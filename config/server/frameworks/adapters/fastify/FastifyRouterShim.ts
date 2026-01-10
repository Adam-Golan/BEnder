import { IRequest, IResponse, HttpMethod, RouteHandler } from "../../../types";

export class FastifyRouterShim {
    private routes: { method: HttpMethod, path: string, handler: RouteHandler }[] = [];
    private mounts: { path: string, router: FastifyRouterShim }[] = [];

    // Unified .use method for global middleware or mounting sub-routers
    // Limitation: This naive shim assumes 'path' is provided. Express supports .use(handler).
    // We strictly follow the User's noticed pattern: .use(path, instance)
    public use(pathOrHandler: string | any, handlerOrRouter?: any) {
        if (typeof pathOrHandler === 'string' && handlerOrRouter) {
            // Mounting or Path-Middleware
            if (handlerOrRouter instanceof FastifyRouterShim) {
                this.mounts.push({ path: pathOrHandler, router: handlerOrRouter });
            } else {
                // Middleware function? Fastify doesn't strictly support path-based middleware without middie.
                // We'll treat it as a shimmed route for all methods? Or ignore?
                // For now, assume it's a router mount as per architecture.
            }
        }
    }

    public get(path: string, handler: RouteHandler) { this.add('get', path, handler); }
    public post(path: string, handler: RouteHandler) { this.add('post', path, handler); }
    public put(path: string, handler: RouteHandler) { this.add('put', path, handler); }
    public delete(path: string, handler: RouteHandler) { this.add('delete', path, handler); }
    public patch(path: string, handler: RouteHandler) { this.add('patch', path, handler); }
    public head(path: string, handler: RouteHandler) { this.add('head', path, handler); }
    public options(path: string, handler: RouteHandler) { this.add('options', path, handler); }

    private add(method: HttpMethod, path: string, handler: RouteHandler) {
        this.routes.push({ method, path, handler });
    }

    // Helper to apply this shim to a real Fastify instance
    public registerTo(fastify: any) {
        this.routes.forEach(r => {
            const path = r.path === '/' ? '' : r.path;
            fastify[r.method](path || '/', async (fastifyReq: any, fastifyReply: any) => {
                // Adapt Fastify (req, reply) to Express (req, res) signature
                const req = fastifyReq;
                // Polyfill params if needed, Fastify has req.params

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
            fastify.register((instance: any, opts: any, done: any) => {
                m.router.registerTo(instance);
                done();
            }, { prefix: m.path });
        });
    }
}
