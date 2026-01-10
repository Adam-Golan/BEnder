import { KoaBase } from "./KoaBase";

export class KoaAdapter extends KoaBase {
    constructor(public app: any, public router: any) {
        super(router);
    }

    use(pathOrHandler: any, handler?: any) {
        typeof pathOrHandler === 'string' && handler
            ? this.router.use(pathOrHandler, this.resolveHandler(handler))
            : this.app.use(pathOrHandler);
        return this;
    }

    protected handle(method: string, path: string, handler: any) {
        if (typeof this.router[method] !== 'function') return;
        this.router[method](path, this.resolveHandler(handler));
    }

    public listen(port: number, cb?: Function) {
        this.app.use(this.router.routes());
        this.app.use(this.router.allowedMethods());
        return this.app.listen(port, cb);
    }
}
