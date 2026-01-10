import { appConfig } from "../../../app.config";
import { IMetadata, BunFrameworkType, FrameworkMiddlewareType, NodeFrameworkType } from "../types";

export abstract class BaseFramework<TFrameworks extends NodeFrameworkType | BunFrameworkType> {
    public abstract metadata: Partial<IMetadata<TFrameworks>>;
    protected abstract routerRef: any;
    protected abstract staticDir: string;
    protected abstract usageKey: string;
    protected abstract middlewares: Record<FrameworkMiddlewareType, Record<TFrameworks, string>>;
    constructor(private fwArr: TFrameworks[]) { }

    public async init(): Promise<BaseFramework<TFrameworks>> {
        this.metadata.framework = this.detectFramework();
        return this;
    };

    public async setupMiddleware(): Promise<void> {
        // Core middleware
        await this.addStaticFiles();
        await this.addCookieParser();
        await this.addMorgan();

        // Security middleware (conditional)`
        if (appConfig.security.cors) await this.addCors();
        if (appConfig.security.helmet) await this.addHelmet();
        if (appConfig.security.rateLimit) await this.addRateLimit();
    }

    // Start the server listening on the given port.
    public abstract listen(port: number, callback?: () => void): void;

    private detectFramework(): TFrameworks {
        for (const tw of this.fwArr) if (this.isInstalled(tw)) return tw;
        throw new Error('Unsupported framework');
    }

    private isInstalled(packageName: TFrameworks): boolean {
        try {
            require.resolve(packageName);
            return true;
        } catch {
            return false;
        }
    }

    // Create a new Router instance (framework specific)
    public abstract createRouter(): Promise<any>;

    // Core middleware - must be implemented by each framework
    protected abstract addStaticFiles(): Promise<void>;

    // Security middleware - conditionally applied based on config
    protected async addCors(): Promise<void> {
        try {
            const module = await import(this.middlewares.cors[this.metadata.framework!]);
            const cors = module.cors || module.default;
            if (cors) this.metadata.server[this.usageKey](cors(appConfig.security.cors));
        } catch (error) {
            throw new Error(`Failed to add CORS middleware: ${error}`);
        }
    };

    protected async addHelmet(): Promise<void> {
        try {
            // Hono: secureHeaders. Elysia: html?
            const module = await import(this.middlewares.helmet[this.metadata.framework!]);
            const helmet = module.secureHeaders || module.default; // Hono uses secureHeaders
            if (helmet) this.metadata.server[this.usageKey](helmet(appConfig.security.helmet));
        } catch (error) {
            throw new Error(`Failed to add helmet middleware: ${error}`);
        }
    };

    protected async addRateLimit(): Promise<void> {
        try {
            const module = await import(this.middlewares.rateLimit[this.metadata.framework!]);
            const limiter = module.rateLimit || module.rateLimiter || module.default; // Check specific exports
            if (limiter) this.metadata.server[this.usageKey](limiter(appConfig.security.rateLimit));
        } catch (error) {
            throw new Error(`Failed to add rate limit middleware: ${error}`);
        }
    };

    protected async addCookieParser(): Promise<void> {
        try {
            const pkg = this.middlewares.cookieParser[this.metadata.framework!];
            if (!pkg || this.metadata.framework === 'hono') return;

            const module = await import(pkg);
            const cookieParser = module.cookie || module.default; // Elysia uses 'cookie'
            if (cookieParser) this.metadata.server[this.usageKey](cookieParser());
        } catch (error) {
            throw new Error(`Failed to add cookie parser middleware: ${error}`);
        }
    }

    protected async addMorgan(): Promise<void> {
        try {
            const module = await import(this.middlewares.morgan[this.metadata.framework!]);
            const logger = module.logger || module.default; // Hono uses 'logger', Elysia uses 'logger'
            if (logger) this.metadata.server[this.usageKey](logger());
        } catch (error) {
            throw new Error(`Failed to add morgan middleware: ${error}`);
        }
    }
}