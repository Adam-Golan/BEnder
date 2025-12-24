import { IRequest, IResponse } from "../../../../types";
import { KoaBase } from "./KoaBase";

export class KoaRouterShim extends KoaBase {
    constructor(public router: any) {
        super(router);
    }

    use(pathOrHandler: any, handler?: any) {
        typeof pathOrHandler === 'string' && handler
            ? this.router.use(pathOrHandler, this.resolveHandler(handler))
            : this.router.use(pathOrHandler);
        return this;
    }

    // Wraps the generic (req, res) handler into Koa's (ctx, next)
    protected handle(method: string, path: string, handler: Function) {
        // Handle method availability (e.g. some routers might miss 'head')
        if (typeof this.router[method] !== 'function') return;

        this.router[method](path, async (ctx: any, next: any) => {
            const req = this.adaptRequest(ctx);
            const res = this.adaptResponse(ctx);

            try {
                await handler(req, res);
            } catch (err) {
                console.error('Koa Route Error:', err);
                ctx.status = 500;
                ctx.body = { error: 'Internal Server Error' };
            }
        });
    }

    private adaptRequest(ctx: any): IRequest {
        return {
            ...ctx.request, // Inherit standard props (url, method, etc.)
            params: ctx.params || {},
            query: ctx.query || {},
            headers: ctx.headers,
            body: ctx.request.body // Depends on koa-bodyparser
        } as unknown as IRequest;
    }

    private adaptResponse(ctx: any): IResponse {
        const res: Partial<IResponse> = {
            status: (code: number) => {
                ctx.status = code;
                return res as IResponse;
            },
            json: (data: any) => {
                ctx.body = data;
                return res as IResponse;
            },
            send: (data: any) => {
                ctx.body = data;
                return res as IResponse;
            },
            type: (type: string) => {
                ctx.type = type;
                return res as IResponse;
            }
        };
        return res as IResponse;
    }

    /**
     * Returns the Koa middleware composed of routes and allowed methods.
     * This is what should be passed to app.use()
     */
    public middleware() {
        return this.router.routes();
    }
    
    // Expose allowedMethods middleware separately if needed, or bundle?
    // Usually usage is: .use(router.routes()).use(router.allowedMethods())
    // We'll bundle allowedMethods in middleware() if feasible? 
    // No, strictly middleware() returns routes(). application logic handles mounting.
}
