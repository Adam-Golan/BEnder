import { Synapse } from "../../base";
import { Request, Response } from 'express';

export class GET_API extends Synapse {
    constructor() {
        super(__dirname);
    }
    protected async setRouter(): Promise<void> {
        this.router.use(`/:action`, (req: Request, res: Response) => {
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