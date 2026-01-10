
import { join } from "path";
import { NodeFrameworkType, IMetadata } from "../types";
import { FastifyRouterShim } from "./adapters/fastify/FastifyRouterShim";
import { KoaRouterShim } from "./adapters/koa/KoaRouterShim";
import { KoaAdapter } from "./adapters/koa/KoaAdapter";
import { BaseFramework } from "./Base";

export class NodeFramework extends BaseFramework<NodeFrameworkType> {
    public metadata: Partial<IMetadata<NodeFrameworkType>> = { runtime: 'node' };
    protected routerRef: any;
    protected staticDir: string = join(__dirname, '../../../public');
    protected usageKey: string = '';

    // Extended middleware map for Koa/Express/Fastify
    protected middlewares: Record<'cors' | 'cookieParser' | 'helmet' | 'morgan' | 'rateLimit' | 'static' | 'bodyParser', Record<string, string>> = {
        cors: { express: 'cors', fastify: '@fastify/cors', koa: '@koa/cors' },
        cookieParser: { express: 'cookie-parser', fastify: '@fastify/cookie', koa: '' },
        helmet: { express: 'helmet', fastify: '@fastify/helmet', koa: 'koa-helmet' },
        morgan: { express: 'morgan', fastify: 'fastify-morgan', koa: 'koa-morgan' },
        rateLimit: { express: 'express-rate-limit', fastify: '@fastify/rate-limit', koa: 'koa-ratelimit' },
        static: { express: 'express', fastify: '@fastify/static', koa: 'koa-static' },
        bodyParser: { koa: 'koa-bodyparser' }
    };

    public async init(): Promise<BaseFramework<NodeFrameworkType>> {
        await super.init();
        // @ts-ignore
        this.routerRef = this.metadata.framework === 'express'
            // @ts-ignore
            ? (await import('express')).Router
            : this.metadata.framework === 'koa'
                // @ts-ignore
                ? (await import('@koa/router')).default || (await import('@koa/router'))
                : FastifyRouterShim;
        this.usageKey = this.metadata.framework === 'fastify' ? 'register' : 'use';
        switch (this.metadata.framework) {
            case 'express':
            case 'fastify':
                this.metadata.server = (await import(this.metadata.framework)).default();
                break;
            case 'koa':
                // @ts-ignore
                const Koa = (await import('koa')).default;
                this.metadata.server = new KoaAdapter(new Koa(), new this.routerRef());
                break;
        }
        await this.setupMiddleware();
        return this;
    }

    public async createRouter(): Promise<any> {
        if (this.metadata.framework === 'koa') return new KoaRouterShim(new this.routerRef());
        return this.metadata.framework === 'express' ? this.routerRef() : new this.routerRef();
    }

    public listen(port: number, callback?: () => void): void {
        if (!this.metadata.server) throw new Error('Server not initialized');
        this.metadata.framework === 'fastify'
            ? (this.metadata.server as any).listen({ port }, callback)
            : (this.metadata.server as any).listen(port, callback);
    }

    protected async addStaticFiles(): Promise<void> {
        const staticMiddleware = await import(this.middlewares.static[this.metadata.framework!]);

        if (this.metadata.framework === 'express') this.metadata.server.use(staticMiddleware.default(this.staticDir));
        if (this.metadata.framework === 'fastify') this.metadata.server.register(staticMiddleware.default, { root: this.staticDir });
        if (this.metadata.framework === 'koa') {
            const serve = staticMiddleware.default || staticMiddleware;
            this.metadata.server.use(serve(this.staticDir));
        }
    }

    protected async addJsonParser(): Promise<void> {
        if (this.metadata.framework === 'express') {
            // @ts-ignore
            const express = (await import('express')).default;
            this.metadata.server.use(express.json());
        }
        if (this.metadata.framework === 'koa') await this.addKoaBodyParser();
    }

    protected async addUrlEncodedParser(): Promise<void> {
        if (this.metadata.framework === 'express') {
            // @ts-ignore
            const express = (await import('express')).default;
            this.metadata.server.use(express.urlencoded({ extended: true }));
        }
        if (this.metadata.framework === 'koa') await this.addKoaBodyParser();
    }

    private async addKoaBodyParser() {
        if ((this as any)._koaBodyParserAdded) return;
        (this as any)._koaBodyParserAdded = true;

        const bodyParserModule = await import(this.middlewares.bodyParser.koa!);
        const bodyParser = bodyParserModule.default || bodyParserModule;
        this.metadata.server.use(bodyParser());
    }

    public async setupMiddleware(): Promise<void> {
        if (this.metadata.framework === 'express' || this.metadata.framework === 'koa') {
            await this.addJsonParser();
            await this.addUrlEncodedParser();
        }
        await super.setupMiddleware();
    }
}
