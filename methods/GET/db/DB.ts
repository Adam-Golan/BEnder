import { Synapse } from "../../base";
import { IRequest, IResponse } from "../../../config/server/types";

export class GET_DB extends Synapse {
    constructor() {
        super(__dirname);
    }
    protected async setRouter(): Promise<void> {
        this.router.use(`/:action`, (req: IRequest, res: IResponse) => {
            let response: unknown;
            let status: number;

            switch (req.params.action) {
                default:
                    console.log(`unknown action: ${req.params.action}`);
                    status = 400;
                    response = { error: 'unknown request' };
            }

            this.responser(res, status, response);
        });
    }
}