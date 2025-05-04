import type { Request, Response } from "express";
import { server } from './config/infrastructure';
import keys from './config/keys';
import { DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT } from './methods';

server
    .get('/*\w', new GET().router)
    .put('/*\w', new PUT().router)
    .head('/*\w', new HEAD().router)
    .post('/*\w', new POST().router)
    .patch('/*\w', new PATCH().router)
    .delete('/*\w', new DELETE().router)
    .options('/*\w', new OPTIONS().router)
    .use((_: Request, res: Response) => { res.status(404).json({ message: 'Route not found' }) });

server.listen(keys.env.port, () => console.log(`Server is running on port ${keys.env.port}`));
