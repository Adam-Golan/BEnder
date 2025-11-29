import { config } from 'dotenv';

// Load environment variables
config();

// Validate required environment variables
const requiredEnvVars = ['PORT', 'NODE_ENV'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.warn(`Warning: Missing environment variables: ${missingEnvVars.join(', ')}`);
}

export default {
    env: {
        port: parseInt(process.env.PORT || '3000', 10),
        nodeEnv: process.env.NODE_ENV || 'development',
        isDevelopment: process.env.NODE_ENV === 'development',
        isProduction: process.env.NODE_ENV === 'production'
    },
    db: {
        type: process.env.DB_TYPE as 'sql' | 'nosql' | 'keyvalue' | 'graph' | 'document' | 'timeseries' | 'cloud' | undefined,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
        name: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectionString: process.env.DB_CONNECTION_STRING
    },
    redis: {
        url: process.env.REDIS_URL
    },
    security: {
        jwtSecret: process.env.JWT_SECRET,
        sessionSecret: process.env.SESSION_SECRET
    }
}