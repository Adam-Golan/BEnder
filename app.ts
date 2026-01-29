import { IRequest, IResponse } from "./config/server/types";
import { initInfrastructure, framework } from './config/infrastructure';
import keys from './config/keys';
import { DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT } from './methods';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { existsSync } from 'node:fs';

(async () => {
    const filePath = join(process.cwd(), 'public', 'index.html');
    const file = await readFile(filePath);
    
    // 1. Initialize Infrastructure (Framework + DB + Global Middleware)
    await initInfrastructure();

    if (!framework) throw new Error('Failed to initialize framework.\nCheck installations or workflow.');
    
    // 2. Initialize Neurons
    const [get, put, head, post, patch, del, options] = [new GET(), new PUT(), new HEAD(), new POST(), new PATCH(), new DELETE(), new OPTIONS()];

    // Await all route registrations
    const results = await Promise.allSettled([get, put, head, post, patch, del, options].map(n => n.ready));
    results.forEach((r, i) => r.status === 'rejected' && console.error(`[Neuron ${i}] Failed to initialize:`, r.reason));

    // 3. Mount Neurons (Using universal '*' pattern, adjusted for Express 5)
    // Note: server (from framework.metadata.server) is compatible with .get/.post via generic wrapper or native API

    // Express 5 requires '(.*)' for wildcards, others use '*'
    const wildcard = ['express', 'koa'].includes(framework.type!) ? '/{*splat}' : '*';

    framework
        .get(wildcard, get.router)
        .put(wildcard, put.router)
        .head(wildcard, head.router)
        .post(wildcard, post.router)
        .patch(wildcard, patch.router)
        .delete(wildcard, del.router)
        .options(wildcard, options.router)
        .use(async (_: IRequest, res: IResponse, next: () => Promise<void>) => {
            // Check if the requested URL actually exists as a file (e.g., /main.js)
            if (extname(filePath) && existsSync(filePath)) {
                // Set MIME type based on extension (simple version)
                const mimeTypes: Record<string, string> = {
                    '.js': 'application/javascript',
                    '.css': 'text/css',
                    '.json': 'application/json',
                    '.png': 'image/png',
                    '.html': 'text/html',
                };
                res.setHeader('Content-Type', mimeTypes[extname(filePath)] || 'text/plain');
                return res.send(file);
            }

            // If it's not a file, move to the next middleware (the fallback)
            next();
        });

    // 4. Start Listening
    framework.listen(keys.env.port, () => console.log(`Server is running on port ${keys.env.port}`));
})();
