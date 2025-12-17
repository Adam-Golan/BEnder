export type RuntimeType = 'node' | 'bun';
export type NodeFrameworkType = 'express' | 'fastify';
export type BunFrameworkType = 'elysia' | 'hono';
export type FrameworkMiddlewareType = 'cors' | 'cookieParser' | 'helmet' | 'morgan' | 'rateLimit';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';

export type RouteHandler<TReq = any, TRes = any> = (req: TReq, res: TRes) => void | Promise<void>;

export interface IRequest<TBody = any, TQuery = any, TParams = any> {
    body: TBody;
    query: TQuery;
    params: TParams;
    headers: any;
    [key: string]: any;
}

export interface IResponse<TData = any> {
    status(code: number): { 
        json: IResponse['json']; 
        send: IResponse['send']; 
    };
    json(data: TData): this;
    send(data: string | Buffer): this;
    type(type: string): this;
}

export interface IMetadata<TFramework> {
    runtime: RuntimeType;
    framework: TFramework;
    server: any;
}