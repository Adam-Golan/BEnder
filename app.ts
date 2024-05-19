import { server } from './config/infrastructure';
import keys from './config/keys';
import { GET, DELETE, PATCH, POST, PUT } from './methods';

server
    .get('/**', new GET().router)
    .post('/**', new POST().router)
    .put('/**', new PUT().router)
    .patch('/**', new PATCH().router)
    .delete('/**', new DELETE().router);

server.listen(keys.env.port, () => console.log(`Server is running on port ${keys.env.port}`));