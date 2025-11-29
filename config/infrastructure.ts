import express, { type Express, json, urlencoded } from "express";
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { join } from 'path';
import cookieParser from 'cookie-parser';

import { appConfig } from '../app.config';

export const server: Express = express();
export const publicDir = join(__dirname, '..', 'public');

server
    .use(express.static(publicDir))
    .use(json())
    .use(urlencoded({ extended: true }))
    .use(cookieParser())
    .use(morgan('dev'));

if (appConfig.security.helmet) {
    server.use(helmet({
        contentSecurityPolicy: appConfig.security.helmet.contentSecurityPolicy
    }));
}

if (appConfig.security.cors) {
    server.use(cors({
        origin: appConfig.security.cors.origins ?? [],
        methods: appConfig.security.cors.methods ?? [],
        allowedHeaders: appConfig.security.cors.headers ?? [],
    }));
}

if (appConfig.security.rateLimit) {
    server.use(rateLimit({
        windowMs: appConfig.security.rateLimit.windowMs ?? 15 * 60 * 1000,
        max: appConfig.security.rateLimit.max ?? 100,
    }));
}

// Database connection instances (exported for use in Synapses)
export let dbConnection: any = null;

if (appConfig.db) {
    const dbConfig = appConfig.db;

    switch (dbConfig.type) {
        case 'sql':
            // Generic SQL connection scaffolding
            // Supports: PostgreSQL, MySQL, MS SQL Server, Oracle, SQLite, etc.
            // Implementation suggestion: Use connection pooling libraries
            // - PostgreSQL: pg, pg-pool
            // - MySQL: mysql2
            // - MS SQL: mssql
            // - Multi-DB ORM: TypeORM, Sequelize, Prisma
            console.log('[DB] SQL database type selected');
            if (dbConfig.sql) {
                console.log(`[DB] Connecting to ${dbConfig.sql.type} at ${dbConfig.sql.host}:${dbConfig.sql.port}`);
                // Example: dbConnection = await createSQLConnection(dbConfig.sql);
            }
            break;

        case 'nosql':
            // Generic NoSQL connection scaffolding
            // Supports: MongoDB, CouchDB, Cassandra, etc.
            // Implementation suggestion:
            // - MongoDB: mongoose, mongodb native driver
            // - Cassandra: cassandra-driver
            console.log('[DB] NoSQL database type selected');
            if (dbConfig.nosql) {
                console.log(`[DB] Connecting to ${dbConfig.nosql.type}`);
                // Example: dbConnection = await createNoSQLConnection(dbConfig.nosql);
            }
            break;

        case 'keyvalue':
            // Generic Key-Value store connection scaffolding
            // Supports: Redis, Memcached, DynamoDB, Riak, etc.
            // Implementation suggestion:
            // - Redis: ioredis, redis
            // - Memcached: memcached
            // - DynamoDB: aws-sdk
            console.log('[DB] Key-Value store type selected');
            if (dbConfig.keyvalue) {
                console.log(`[DB] Connecting to ${dbConfig.keyvalue.type}`);
                // Example: dbConnection = await createKeyValueConnection(dbConfig.keyvalue);
            }
            break;

        case 'document':
            // Generic Document database connection scaffolding
            // Supports: MongoDB, CouchDB, RavenDB, etc.
            // Implementation suggestion:
            // - MongoDB: mongoose
            // - CouchDB: nano
            console.log('[DB] Document database type selected');
            if (dbConfig.document) {
                console.log(`[DB] Connecting to ${dbConfig.document.type}`);
                // Example: dbConnection = await createDocumentDBConnection(dbConfig.document);
            }
            break;

        case 'graph':
            // Generic Graph database connection scaffolding
            // Supports: Neo4j, Amazon Neptune, TigerGraph, etc.
            // Implementation suggestion:
            // - Neo4j: neo4j-driver
            // - Neptune: gremlin (AWS Neptune compatible)
            console.log('[DB] Graph database type selected');
            if (dbConfig.graph) {
                console.log(`[DB] Connecting to ${dbConfig.graph.type}`);
                // Example: dbConnection = await createGraphDBConnection(dbConfig.graph);
            }
            break;

        case 'timeseries':
            // Generic Time-series database connection scaffolding
            // Supports: InfluxDB, TimescaleDB, OpenTSDB, etc.
            // Implementation suggestion:
            // - InfluxDB: @influxdata/influxdb-client
            // - TimescaleDB: pg (PostgreSQL extension)
            console.log('[DB] Time-series database type selected');
            if (dbConfig.timeseries) {
                console.log(`[DB] Connecting to ${dbConfig.timeseries.type}`);
                // Example: dbConnection = await createTimeSeriesConnection(dbConfig.timeseries);
            }
            break;

        case 'cloud':
            // Generic Cloud-managed database connection scaffolding
            // Supports: AWS RDS/DynamoDB/Aurora, Google Cloud SQL/Firestore, Azure SQL/CosmosDB
            // Implementation suggestion: Use cloud provider SDKs
            // - AWS: aws-sdk
            // - Google Cloud: @google-cloud/*
            // - Azure: @azure/*
            console.log('[DB] Cloud database type selected');
            if (dbConfig.cloud) {
                console.log(`[DB] Connecting to ${dbConfig.cloud.type} in region ${dbConfig.cloud.region}`);
                // Example: dbConnection = await createCloudDBConnection(dbConfig.cloud);
            }
            break;

        default:
            console.warn('[DB] Unknown database type specified in config');
    }
}