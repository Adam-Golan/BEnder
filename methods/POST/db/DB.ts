import { RouterBase } from "../../base";
import { Request, Response } from 'express';

export class POST_DB extends RouterBase {
    protected setRouter(): void {
        this.router.use(`/${this.baseRoute}/:action`, (req: Request, res: Response) => {
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