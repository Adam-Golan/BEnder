import { ApiConfig, AuthConfig, DBConfig, SecurityConfig } from "./config/interfaces";

export const appConfig: AppConfig = {
    security: {
        cors: {
            origins: ['http://localhost:3000'],
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
            headers: ['Content-Type', 'Authorization'],
        },
        rateLimit: {
            windowMs: 15 * 60 * 1000,
            max: 100,
        },
        helmet: {
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", 'https://cdn.example.com'],
                    styleSrc: ["'self'", 'https://fonts.googleapis.com'],
                    imgSrc: ["'self'", 'https://example.com'],
                },
            },
        },
    },
    api: {
        prefix: '/api',
        version: 'v1',
    },
    requiredEnvVars: ['PORT', 'NODE_ENV'],
};

export interface AppConfig {
    db?: DBConfig;
    auth?: AuthConfig;
    security: SecurityConfig;
    api?: ApiConfig;
    requiredEnvVars: string[];
}
