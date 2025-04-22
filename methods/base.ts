import { Router, Response } from 'express';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export abstract class Synapse {
    abstract dir: string;
    readonly router: Router = Router();

    readonly errorMsgs = new Map<number, string>([
        [400, 'Bad Request'],
        [401, 'Unauthorized'],
        [402, 'Payment Required'],
        [403, 'Forbidden'],
        [404, 'Not Found'],
        [405, 'Method Not Allowed'],
        [406, 'Not Acceptable'],
        [408, 'Request Timeout'],
        [409, 'Conflict'],
        [412, 'Precondition Failed'],
        [413, 'Request Entity Too Large'],
        [414, 'Request URI Too Long'],
        [415, 'Unsupported Media Type'],
        [418, 'I\'m a teapot'],
        [429, 'Too Many Requests'],
        [500, 'Internal Server Error'],
        [501, 'Not Implemented'],
        [502, 'Bad Gateway'],
        [503, 'Service Unavailable'],
        [504, 'Gateway Timeout']
    ]);

    constructor() {
        setTimeout(() => this.setRouter());
    }

    protected abstract setRouter(): void;

    protected async tryer<T>(fn: () => T, successCode: number = 200): Promise<{ code: number, data: T | unknown }> {
        try {
            return { code: successCode, data: await fn() };
        } catch (err) {
            // Creating local error log path.
            const path = join(this.dir, '_errors.json');
            // Writing error log.
            const log = { timestamp: new Date().toLocaleString(), error: err };
            // Reading error log.
            const logs = existsSync(path) ? JSON.parse(readFileSync(path, { encoding: 'utf8' })) : [];
            // Pushing error log.
            logs.push(log);
            // Writing error log.
            writeFileSync(path, JSON.stringify(logs), { encoding: 'utf8' });
            return { code: 500, data: err };
        }
    }

    protected responser(res: Response, code: number, payload: unknown): void {
        if (code >= 400) {
            res.status(code).json({
                error: this.errorMsgs.get(code) ?? 'Unknown Error',
                msg: payload
            });
        } else {
            res.status(code).json({ data: payload });
        }
    }
}

export abstract class Neuron extends Synapse {
    protected async setRouter(): Promise<void> {
        // Scann local directory for sub directories.
        for (const localDir of this.getContent(this.dir, 'dir')) {
            if (localDir[0] === '_') continue;
            // Scann sub directory for sub modules.
            for (const subModule of this.getContent(join(this.dir, localDir), 'file')) {
                if (subModule[0] === '_') continue;
                try {
                    // Import sub module.
                    const module = await import(join(this.dir, localDir, subModule));
                    // Create sub module and using its router.
                    for (const key in module) this.router.use(`/${localDir}`, new module[key]().router);
                } catch (err) {
                    console.error(`Failed creating ${localDir}/${subModule}`);
                    console.error(err);
                }
            }
        }
    }

    private getContent(path: string, type: 'dir' | 'file'): string[] {
        const content = readdirSync(path, { withFileTypes: true });
        const checkType = type === 'dir' ? 'isDirectory' : 'isFile';
        return content.filter(content => content[checkType]()).map(content => content.name);
    }
}
