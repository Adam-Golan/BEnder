import { Router, Response } from 'express';
import { readdirSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { Readable } from 'stream';

export type ResponseType = 'json' | 'html' | 'text' | 'stream';

export abstract class Synapse {
    readonly router: Router = Router();
    readonly ready: Promise<void> = Promise.resolve();

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

    constructor(protected dir: string) {
        this.ready = this.setRouter();
    }

    protected abstract setRouter(): Promise<void>;

    protected async tryer<T>(fn: () => Promise<T>, successCode: number = 200): Promise<{ code: number, data: T | string }> {
        try {
            return { code: successCode, data: await fn() };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            const stack = err instanceof Error ? err.stack : undefined;

            // Async error logging - "fool proof" by design
            const path = join(this.dir, '_errors.json');
            const log = { timestamp: new Date().toISOString(), error: `${fn.name}: ${message}`, stack };

            readFile(path, { encoding: 'utf8' })
                .then(data => JSON.parse(data))
                .catch(() => [])
                .then(logs => {
                    logs.push(log);
                    return writeFile(path, JSON.stringify(logs, null, 2), { encoding: 'utf8' });
                });

            return { code: 500, data: message };
        }
    }

    protected responser(res: Response, code: number, payload: unknown, type: ResponseType = 'json'): void {
        res.status(code);

        if (code >= 400) {
            res.json({ error: this.errorMsgs.get(code) ?? 'Unknown Error', message: payload });
            return;
        }

        switch (type) {
            case 'html': res.type('html').send(payload); break;
            case 'text': res.type('text').send(payload); break;
            case 'stream':
                if (payload instanceof Readable) payload.pipe(res);
                else res.json({ error: 'Invalid stream payload' });
                break;
            default: res.json(payload);
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
                if (subModule[0] === '_' || subModule.includes('.d.') || subModule.endsWith('.json')) continue;
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
