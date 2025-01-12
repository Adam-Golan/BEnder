import type { Request, Response } from "express";
import { server } from './config/infrastructure';
import keys from './config/keys';
import { DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT } from './methods';

server
    .get('/**', new GET().router)
    .put('/**', new PUT().router)
    .head('/**', new HEAD().router)
    .post('/**', new POST().router)
    .patch('/**', new PATCH().router)
    .delete('/**', new DELETE().router)
    .options('/**', new OPTIONS().router)
    .use((_: Request, res: Response) => res.status(404).json({ message: 'Route not found' }));

server.listen(keys.env.port, () => console.log(`Server is running on port ${keys.env.port}`));