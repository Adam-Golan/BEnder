import { Router } from 'express';

export abstract class RouterBase {
    router: Router = Router();

    constructor() {
        setTimeout(() => this.setRouter());
    }

    protected abstract setRouter(): void;
}

export abstract class MethodBase extends RouterBase {
    abstract routes: { [k: string]: typeof RouterBase };

    protected setRouter(): void {
        Object.entries(this.routes).forEach(([service, Router]) => this.router.use(`/${service}`, new (Router as any)().router));
    }
}