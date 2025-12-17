
import { join } from "path";
import { NodeFrameworkType, HttpMethod, RouteHandler, IMetadata } from "../../types";
import { FastifyRouterShim } from "./FastifyRouterShim";
import { BaseFramework } from "../Base";

export class NodeFramework extends BaseFramework<NodeFrameworkType> {
    public metadata: Partial<IMetadata<NodeFrameworkType>> = { runtime: 'node' };
    protected staticDir: string = join(__dirname, '../../../../public');
    protected usageKey: string = '';
    protected middlewares: Record<'cors' | 'cookieParser' | 'helmet' | 'morgan' | 'rateLimit' | 'static', Record<NodeFrameworkType, string>> = {
        cors: { express: 'cors', fastify: '@fastify/cors' },
        cookieParser: { express: 'cookie-parser', fastify: '@fastify/cookie' },
        helmet: { express: 'helmet', fastify: '@fastify/helmet' },
        morgan: { express: 'morgan', fastify: 'fastify-morgan' },
        rateLimit: { express: 'express-rate-limit', fastify: '@fastify/rate-limit' },
        static: { express: 'express', fastify: '@fastify/static' }
    };

    public async init(): Promise<BaseFramework<NodeFrameworkType>> {
        await super.init();
        this.usageKey = this.metadata.framework === 'express' ? 'use' : 'register';
        // @ts-ignore
        this.metadata.server = (await import(this.metadata.framework)).default();
        await this.setupMiddleware();
        return this;
    }

    public async createRouter(): Promise<any> {
        return this.metadata.framework === 'express'
            ? require('express').Router()
            : new FastifyRouterShim();
    }

    public listen(port: number, callback?: () => void): void {
        if (!this.metadata.server) throw new Error('Server not initialized');
        this.metadata.framework === 'express'
            ? (this.metadata.server as any).listen(port, callback)
            : (this.metadata.server as any).listen({ port }, callback);
    }

    protected async addStaticFiles(): Promise<void> {
        const staticMiddleware = await import(this.middlewares.static[this.metadata.framework!]);
        this.metadata.framework === 'express'
            ? this.metadata.server.use(staticMiddleware.default(this.staticDir))
            : this.metadata.server.register(staticMiddleware.default, { root: this.staticDir });
    }

    protected async addJsonParser(): Promise<void> {
        if (this.metadata.framework === 'express') {
            const express = (await import('express')).default;
            this.metadata.server.use(express.json());
        }
        // Fastify has built-in JSON parsing
    }

    protected async addUrlEncodedParser(): Promise<void> {
        if (this.metadata.framework === 'express') {
            const express = (await import('express')).default;
            this.metadata.server.use(express.urlencoded({ extended: true }));
        }
        // Fastify has built-in form parsing via @fastify/formbody if needed
    }

    public async setupMiddleware(): Promise<void> {
        if (this.metadata.framework === 'express') {
            await this.addJsonParser();
            await this.addUrlEncodedParser();
        }
        await super.setupMiddleware();
    }
}
