
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export class FastifyAdapter {
    constructor(public readonly instance: FastifyInstance) {
        // Disable auto-HEAD routes to prevent collision
        // Note: instance should be initialized with { exposeHeadRoutes: false } by the caller
    }

    // Adapt .use() to support Express-style middleware (req, res, next)
    // and Router mounting (path, router)
    public use(pathOrHandler: string | any, handler?: any) {
        if (typeof pathOrHandler === 'function') {
            const func = pathOrHandler;
            // Check if it's a Fastify plugin (Async or Callback style)
            // Plugins: (instance, opts) => Promise/void or (instance, opts, done) => void
            // Middleware: (req, res, next) => void

            // Heuristic A: Helper symbols (fastify-plugin)
            if (func[Symbol.for('fastify.display-name')] || func[Symbol.for('plugin-meta')]) {
                this.instance.register(func);
                return;
            }

            // Heuristic B: Argument length? 
            // Fastify plugin: 2 args (instance, opts) or 3 args (instance, opts, done)
            // Express middleware: 3 args (req, res, next)
            // Collision on 3 args. 
            // Check common Fastify plugins explicitly?
            // @fastify/cors, @fastify/helmet, etc. are plugins.

            // Better Heuristic: Check function name or try/catch registration?
            // Actually, BaseFramework calls `cors(options)`.
            // @fastify/cors usage: `register(require('@fastify/cors'), options)`
            // Wait! `BaseFramework` does: `middleware = require('@fastify/cors'); server.use(middleware(options))`
            // @fastify/cors EXPORTS the plugin function directly. It doesn't have a factory that returns a plugin like `cors()`.
            // Wait, standard usage is `register(cors, options)`.
            // But `BaseFramework` does `cors(options)`.
            // If `cors` is the plugin function itself, calling `cors(options)` is WRONG.
            // Fastify plugins are NOT factories.

            // FIX: BaseFramework logic is fundamentally incompatible with Fastify plugins usage pattern if it treats them as factories.
            // EXPRESS: import cors; app.use(cors(options));
            // FASTIFY: import cors; app.register(cors, options);

            // I cannot change BaseFramework.
            // BaseFramework: `const module = import...; const cors = module.default; server.use(cors(options))`

            // Therefore, for Fastify, `module.default` MUST be a factory that returns a plugin.
            // But `@fastify/cors` is NOT a factory.

            // Conclusion: `NodeFramework` MUST usage a wrapper/shim for these middlewares if we strictly cannot touch BaseFramework.
            // OR checks in NodeFramework?

            // But earlier I decided to revert to `@fastify/cors`.
            // If I stick with `@fastify/cors`, BaseFramework will crash trying to call it as a function `cors(opts)`.

            // RE-EVALUATION: To support `BaseFramework`'s `cors(options)` call without changing it, 
            // `NodeFramework.middlewares` must point to modules that EXPORT a factory function.
            // Native `@fastify/cors` does not.

            // SOLUTION: Create local adapter files for each middleware!
            // e.g. `config/server/frameworks/adapters/fastify/middleware/cors.ts`
            // export default (options) => (instance, opts, done) => { ... register real cors ... }

            // OR use Generic wrapper in Adapter? No, BaseFramework imports the string path.

            // QUICK FIX: Since I cannot change BaseFramework, and I must use Fastify...
            // Update `NodeFramework.ts` middleware paths to point to a new local shim file that standardizes this.

            // WRAPPING STRATEGY:
            // Create `config/server/frameworks/adapters/fastify/middlewares.ts`
            // Re-export wrappers for all.

            if (func.length === 3 || func.length === 2) {
                // Assuming Express style given BaseFramework usage
                this.instance.addHook('onRequest', (req: FastifyRequest, reply: FastifyReply, done: Function) => {
                    const res = {
                        setHeader: (k: string, v: string) => reply.header(k, v),
                        getHeader: (k: string) => reply.raw.getHeader(k),
                        end: (d: any) => reply.raw.end(d),
                        statusCode: 200
                    };
                    Object.defineProperty(res, 'statusCode', { set: (v) => reply.code(v), get: () => reply.statusCode });
                    pathOrHandler(req.raw, res, done);
                });
            }
        } else if (typeof pathOrHandler === 'string' && handler) {
            if (typeof handler.registerTo === 'function') {
                // It's a shimmed router (FastifyRouterShim) or compatible
                handler.registerTo(this.instance, { prefix: pathOrHandler });
            } else if (typeof handler === 'function') {
                // Path-based middleware (e.g. 404 handler in app.ts is .use((req, res) => ...))
                // Fastify doesn't support wildcards in .use easily without 'middie'
                // But app.ts uses it for 404 catch-all.
                // We can use setNotFoundHandler as a fallback if this is the intent?
                // Checking if it's the 404 signature...

                if (handler.length === 2 || handler.length === 3) {
                    // Assume it's a request handler. 
                    // For 404 catch-all, app.ts does .use((_, res) => res.status(404)...)
                    // We can register a fallback route?
                    // Or better, just setNotFoundHandler directly.

                    this.instance.setNotFoundHandler(async (req, reply) => {
                        const res = {
                            status: (c: number) => { reply.code(c); return res; },
                            json: (d: any) => reply.send(d),
                            send: (d: any) => reply.send(d)
                        };
                        await handler(req, res);
                    });
                }
            }
        }
    }

    // Method delegation
    public get(path: string, handler: any) { this.instance.get(path, this.wrap(handler)); return this; }
    public post(path: string, handler: any) { this.instance.post(path, this.wrap(handler)); return this; }
    public put(path: string, handler: any) { this.instance.put(path, this.wrap(handler)); return this; }
    public delete(path: string, handler: any) { this.instance.delete(path, this.wrap(handler)); return this; }
    public patch(path: string, handler: any) { this.instance.patch(path, this.wrap(handler)); return this; }
    public head(path: string, handler: any) { this.instance.head(path, this.wrap(handler)); return this; }

    // Suppress manual OPTIONS registration to allow @fastify/cors to handle preflight
    public options(path: string, handler: any) {
        // console.warn('Skipping manual OPTIONS registration for ' + path + ' in favor of CORS plugin');
        return this;
    }

    public listen(options: any, cb: any) {
        return this.instance.listen(options, cb);
    }

    public register(plugin: any, opts: any) {
        return this.instance.register(plugin, opts);
    }

    // Helper to wrap our Shimmed/Standard handlers (req, res) -> Fastify
    private wrap(handler: any) {
        return async (req: FastifyRequest, reply: FastifyReply) => {
            const res = {
                status: (c: number) => { reply.code(c); return res; },
                json: (d: any) => reply.send(d),
                send: (d: any) => reply.send(d),
                type: (t: string) => { reply.type(t); return res; }
            };
            return handler(req, res); // Pass raw req? Or wrapped? Shim expects raw usually or compatible.
        };
    }
}
