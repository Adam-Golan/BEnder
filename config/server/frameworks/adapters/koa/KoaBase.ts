import { KoaRouterShim } from "./KoaRouterShim";

export abstract class KoaBase {
    constructor(public router: any) {
    }

    protected abstract use(pathOrHandler: any, handler?: any): this;

    protected abstract handle(method: string, path: string, handler: any): void;

    get(path: string, handler: any) { this.handle('get', path, handler); return this; }
    post(path: string, handler: any) { this.handle('post', path, handler); return this; }
    put(path: string, handler: any) { this.handle('put', path, handler); return this; }
    delete(path: string, handler: any) { this.handle('delete', path, handler); return this; }
    patch(path: string, handler: any) { this.handle('patch', path, handler); return this; }
    head(path: string, handler: any) { this.handle('head', path, handler); return this; }
    options(path: string, handler: any) { this.handle('options', path, handler); return this; }
    all(path: string, handler: any) { this.handle('all', path, handler); return this; }

    protected resolveHandler(handler: any) {
        if (handler instanceof KoaRouterShim) return handler.middleware();
        if (handler && typeof handler.routes === 'function') return handler.routes();
        return handler;
    }
}