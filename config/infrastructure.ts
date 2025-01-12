import express, { type Express, type Request, type Response, json, urlencoded } from "express";
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
    .use(morgan('dev'))
    .use((_: Request, res: Response) => res.status(404).json({ message: 'Route not found' }));

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

if (appConfig.db) {
    switch (appConfig.db.type) {
        case 'cloud':
            break;
        case 'document':
            break;
        case 'graph':
            break;
        case 'keyvalue':
            break;
        case 'nosql':
            break;
        case 'sql':
            break;
        case 'timeseries':
            break;
    }
}