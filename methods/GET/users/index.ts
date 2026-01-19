import { IRequest, IResponse } from "../../../config/server/types";
import { Synapse } from "../../base";

export class GET_Users extends Synapse {
    constructor() {
        super(__dirname);
    }
    protected async setRouter(): Promise<void> {
        this.router.get(`/`, (req: IRequest, res: IResponse) => {
            const users = [
                { id: 1, name: 'Alice', role: 'admin' },
                { id: 2, name: 'Bob', role: 'user' },
                { id: 3, name: 'Charlie', role: 'guest' }
            ];
            this.responser(res, 200, users);
        });

        this.router.get(`/:id`, (req: IRequest, res: IResponse) => {
            const id = parseInt(req.params.id);
            if (isNaN(id)) return this.responser(res, 400, { error: 'Invalid ID' });

            const user = { id, name: `User ${id}`, role: 'user' };
            this.responser(res, 200, user);
        });
    }
}
