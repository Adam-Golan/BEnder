import type { Request, Response } from "express";
import { server } from './config/infrastructure';
import keys from './config/keys';
import { DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT } from './methods';

(async () => {
    const [get, put, head, post, patch, del, options] = [new GET(), new PUT(), new HEAD(), new POST(), new PATCH(), new DELETE(), new OPTIONS()];

    // Await all route registrations - allSettled ensures partial failures don't crash startup
    const results = await Promise.allSettled([get, put, head, post, patch, del, options].map(n => n.ready));
    results.forEach((r, i) => r.status === 'rejected' && console.error(`[Neuron ${i}] Failed to initialize:`, r.reason));

    server
        .get(/.*/, get.router)
        .put(/.*/, put.router)
        .head(/.*/, head.router)
        .post(/.*/, post.router)
        .patch(/.*/, patch.router)
        .delete(/.*/, del.router)
        .options(/.*/, options.router)
        .use((_: Request, res: Response) => { res.status(404).json({ message: 'Route not found' }) });

    server.listen(keys.env.port, () => console.log(`Server is running on port ${keys.env.port}`));
})();
