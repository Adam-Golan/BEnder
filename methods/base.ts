import { Router } from 'express';

export abstract class Synapse {
    router: Router = Router();

    constructor() {
        setTimeout(() => this.setRouter());
    }

    protected abstract setRouter(): void;
}

export abstract class Neuron extends Synapse {
    abstract routes: { [k: string]: typeof Synapse };

    protected setRouter(): void {
        Object.entries(this.routes).forEach(([service, Router]) => this.router.use(`/${service}`, new (Router as any)().router));
    }
}