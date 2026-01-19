import { IRequest, IResponse } from "../../../config/server/types";
import { Synapse } from "../../base";

export class POST_Users extends Synapse {
    constructor() {
        super(__dirname);
    }
    protected async setRouter(): Promise<void> {
        this.router.post(`/`, async (req: IRequest, res: IResponse) => {
            const body = req.body;
            if (!body || Object.keys(body).length === 0) {
                return this.responser(res, 400, { error: 'Missing body' });
            }

            // Mock saving to DB
            const newUser = { id: Math.floor(Math.random() * 1000), ...body, createdAt: new Date() };

            this.responser(res, 201, { message: 'User created successfully', user: newUser });
        });
    }
}
