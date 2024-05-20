import { Synapse } from "../../base";
import { Request, Response } from 'express';

export class POST_API extends Synapse {
    protected setRouter(): void {
        this.router.use(`/:action`, (req: Request, res: Response) => {
            let response, status;
            switch (req.params.action) {
                default:
                    console.log(`unknown action: ${req.params.action}`);
                    status = 400;
                    response = { error: 'unknown request' };
            };
            res.status(status).json(response);
        });
    }
}