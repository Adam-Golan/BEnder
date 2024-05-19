import { RouterBase } from "../../base";
import { Request, Response } from 'express';

export class GET_API extends RouterBase {
    protected setRouter(): void {
        this.router.use(`/:action`, (req: Re quest, res: Response) => {
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