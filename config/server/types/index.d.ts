export type RuntimeType = 'node' | 'bun';
export type NodeFrameworkType = 'express' | 'fastify' | 'koa';
export type BunFrameworkType = 'elysia' | 'hono';
export type FrameworkMiddlewareType = 'cors' | 'cookieParser' | 'helmet' | 'morgan' | 'rateLimit';

export type HttpMethod = 'use' | 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';

export type RouteHandler<TReq = any, TRes = any> = (req: TReq, res: TRes) => void | Promise<void>;

export interface IRequest<TQuery = any, TParams = any, TBody = any> {
    query: TQuery;
    params: TParams;
    body: TBody;
    headers: Record<string, string>;
    next: () => void;
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

import { UniversalAdapter } from '../universalAdapter';

export interface IMetadata<TFramework> {
    runtime: RuntimeType;
    framework: TFramework;
    server: UniversalAdapter;
}

import { Response } from 'express';
import { FastifyReply } from 'fastify';
import { Context as KoaContext } from 'koa';
import { Context as HonoContext } from 'hono';
import { Context as ElysiaContext } from 'elysia';

// Requests
export interface IFrameworkRequest<TQuery = Record<string, string>, TParams = Record<string, string>, TBody = any> {
    headers: Record<string, string>;
    query: TQuery;
    params: TParams;
    body: TBody;
}

export interface IHonoRequest<TQuery = Record<string, string>, TParams = Record<string, string>, TBody = any> {
    header: () => Record<string, string>;
    query: () => TQuery;
    param: () => TParams;
    parseBody: () => TBody;
}

// Responses
export interface IFrameworkResponse {
    set(key: string, value: string): this;
    cookie(key: string, value: string): this;
    status(code: number): this;
    json(data: any): void;
    redirect(url: string): void;
}

export interface IExpressResponse extends Pick<Response, 'set' | 'status' | 'json' | 'redirect' | 'cookie'> { }

export interface IFastifyResponse extends Pick<FastifyReply, 'header' | 'code' | 'send' | 'redirect' | 'cookie'> { }

export interface IKoaResponse extends Pick<KoaContext, 'set' | 'status' | 'body' | 'redirect' | 'cookies'> { }

export interface IHonoResponse extends Pick<HonoContext, 'header' | 'redirect'> {
    status(code: number): this;
    json(data: any): void;
}

export interface IElysiaResponse extends Pick<ElysiaContext, 'headers' | 'status' | 'body' | 'redirect' | 'cookie'> { }

export type IAllResponses = IExpressResponse | IFastifyResponse | IKoaResponse | IHonoResponse | IElysiaResponse;

export type IHandler = (req: IFrameworkRequest, res: IFrameworkResponse, next?: () => Promise<void>) => void;