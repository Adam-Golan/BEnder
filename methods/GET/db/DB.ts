import { Synapse } from "../../base";
import { Request, Response } from 'express';

export class GET_DB extends Synapse {
    dir = __dirname;
    protected setRouter(): void {
        this.router.use(`/:action`, (req: Request, res: Response) => {
            let response, status;
            switch (req.params.action) {
                default:
                    console.log(`unknown action: ${req.params.action}`);
                    status = 400;
                    response = { error: 'unknown request' };
            };
            this.responser(res, status, response);
        });
    }
}