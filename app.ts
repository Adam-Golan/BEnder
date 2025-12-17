import { IRequest, IResponse } from "./config/server/types";
import { initInfrastructure } from './config/infrastructure';
import keys from './config/keys';
import { DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT } from './methods';

(async () => {
    // 1. Initialize Infrastructure (Framework + DB + Global Middleware)
    const { framework, server } = await initInfrastructure();

    // 2. Initialize Neurons
    const [get, put, head, post, patch, del, options] = [new GET(), new PUT(), new HEAD(), new POST(), new PATCH(), new DELETE(), new OPTIONS()];

    // Await all route registrations
    const results = await Promise.allSettled([get, put, head, post, patch, del, options].map(n => n.ready));
    results.forEach((r, i) => r.status === 'rejected' && console.error(`[Neuron ${i}] Failed to initialize:`, r.reason));

    // 3. Mount Neurons (Using universal '*' pattern)
    // Note: server (from framework.metadata.server) is compatible with .get/.post via generic wrapper or native API
    server
        .get('*', get.router)
        .put('*', put.router)
        .head('*', head.router)
        .post('*', post.router)
        .patch('*', patch.router)
        .delete('*', del.router)
        .options('*', options.router)
        .use((_: IRequest, res: IResponse) => { res.status(404).json({ message: 'Route not found' }) });

    // 4. Start Listening
    framework.listen(keys.env.port, () => console.log(`Server is running on port ${keys.env.port}`));
})();
