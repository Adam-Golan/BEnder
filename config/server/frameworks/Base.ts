import { appConfig } from "../../../app.config";
import { IMetadata, BunFrameworkType, FrameworkMiddlewareType, NodeFrameworkType } from "../types";

export abstract class BaseFramework<TFrameworks extends NodeFrameworkType | BunFrameworkType> {
    public abstract metadata: Partial<IMetadata<TFrameworks>>;
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
            const corsModule = (await import(this.middlewares.cors[this.metadata.framework!])).default;
            this.metadata.server[this.usageKey](corsModule(appConfig.security.cors));
        } catch (error) {
            throw new Error(`Failed to add CORS middleware: ${error}`);
        }
    };

    protected async addHelmet(): Promise<void> {
        try {
            const helmetModule = (await import(this.middlewares.helmet[this.metadata.framework!])).default;
            this.metadata.server[this.usageKey](helmetModule(appConfig.security.helmet));
        } catch (error) {
            throw new Error(`Failed to add helmet middleware: ${error}`);
        }
    };

    protected async addRateLimit(): Promise<void> {
        try {
            const rateLimitModule = (await import(this.middlewares.rateLimit[this.metadata.framework!])).default;
            this.metadata.server[this.usageKey](rateLimitModule(appConfig.security.rateLimit));
        } catch (error) {
            throw new Error(`Failed to add rate limit middleware: ${error}`);
        }
    };

    protected async addCookieParser(): Promise<void> {
        try {
            if (this.metadata.framework === 'elysia') return;
            const cookieParserModule = (await import(this.middlewares.cookieParser[this.metadata.framework!])).default;
            this.metadata.server[this.usageKey](cookieParserModule());
        } catch (error) {
            throw new Error(`Failed to add cookie parser middleware: ${error}`);
        }
    }

    protected async addMorgan(): Promise<void> {
        try {
            const morganModule = (await import(this.middlewares.morgan[this.metadata.framework!])).default;
            this.metadata.server[this.usageKey](morganModule());
        } catch (error) {
            throw new Error(`Failed to add morgan middleware: ${error}`);
        }
    }
}