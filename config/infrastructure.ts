import { UniversalAdapter } from './server/universalAdapter';
import { appConfig } from '../app.config';

// Initialize the server handling framework selection and middleware
export let framework: UniversalAdapter | null = null; // Renaming 'server' to 'framework' in export would break consumers, but 'framework' was BaseFramework before.
// Wait, app.ts imports { framework, server }. 
// Old: framework = BaseFramework instance, server = UniversalAdapter instance (metadata.server)
// New: We only have UniversalAdapter.
// app.ts uses 'framework.listen' and 'server.get/post'.
// UniversalAdapter has both listen and get/post.
// So both framework and server should point to the same UniversalAdapter instance.

export const initInfrastructure = async () => {
    // This detects framework (Express/Koa/Fastify/Hono/Elysia) and assign to exported variable
    framework = await UniversalAdapter.init();

    // Connect DB logic (Preserved from previous implementation)
    await connectDatabase();

    return framework;
};

// Database connection instances (exported for use in Synapses)
export let dbConnection: any = null;

async function connectDatabase() {
    if (appConfig.db) {
        const dbConfig = appConfig.db;
        switch (dbConfig.type) {
            case 'sql':
                console.log('[DB] SQL database type selected');
                if (dbConfig.sql) console.log(`[DB] Connecting to ${dbConfig.sql.type} at ${dbConfig.sql.host}:${dbConfig.sql.port}`);
                break;
            case 'nosql':
                console.log('[DB] NoSQL database type selected');
                if (dbConfig.nosql) console.log(`[DB] Connecting to ${dbConfig.nosql.type}`);
                break;
            case 'keyvalue':
                console.log('[DB] Key-Value store type selected');
                if (dbConfig.keyvalue) console.log(`[DB] Connecting to ${dbConfig.keyvalue.type}`);
                break;
            case 'document':
                console.log('[DB] Document database type selected');
                if (dbConfig.document) console.log(`[DB] Connecting to ${dbConfig.document.type}`);
                break;
            case 'graph':
                console.log('[DB] Graph database type selected');
                if (dbConfig.graph) console.log(`[DB] Connecting to ${dbConfig.graph.type}`);
                break;
            case 'timeseries':
                console.log('[DB] Time-series database type selected');
                if (dbConfig.timeseries) console.log(`[DB] Connecting to ${dbConfig.timeseries.type}`);
                break;
            case 'cloud':
                console.log('[DB] Cloud database type selected');
                if (dbConfig.cloud) console.log(`[DB] Connecting to ${dbConfig.cloud.type} in region ${dbConfig.cloud.region}`);
                break;
            default:
                console.warn('[DB] Unknown database type specified in config');
        }
    }
}