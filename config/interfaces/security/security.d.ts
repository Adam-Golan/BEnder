export interface SecurityConfig {
    cors?: CorsConfig;
    rateLimit?: RateLimitConfig;
    helmet?: HelmetConfig;
}

interface CorsConfig {
    origins?: string[];
    methods?: string[];
    headers?: string[];
}

interface RateLimitConfig {
    windowMs?: number;
    max?: number;
}

interface HelmetConfig {
    contentSecurityPolicy?: {
        directives?: {
            defaultSrc?: string[];
            scriptSrc?: string[];
            styleSrc?: string[];
            imgSrc?: string[];
        };
    };
}