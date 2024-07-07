import { Router } from 'express';
import { readFileSync, writeFileSync } from 'fs';

export abstract class Synapse {
    router: Router = Router();

    constructor() {
        setTimeout(() => this.setRouter());
    }

    protected abstract setRouter(): void;

    protected async tryer<T>(fn: () => T, successCode: number = 200): Promise<{ code: number, data: T | unknown }> {
        try {
            return { code: successCode, data: await fn() };
        } catch (err) {
            const errors = await readFileSync('../logs/errors/errors.json', { encoding: 'utf8' });
            const parsed: { timestamp: string, error: unknown }[] = JSON.parse(errors);
            parsed.push({ timestamp: new Date().toLocaleString(), error: err });
            await writeFileSync('../logs/errors/errors.json', JSON.stringify(parsed), { encoding: 'utf8' });
            return { code: 500, data: err };
        }
    }
}

export abstract class Neuron extends Synapse {
    abstract routes: { [k: string]: typeof Synapse };

    protected setRouter(): void {
        Object.entries(this.routes).forEach(([service, Router]) => this.router.use(`/${service}`, new (Router as any)().router));
    }
}