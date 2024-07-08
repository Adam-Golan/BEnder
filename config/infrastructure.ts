import express, { Express, json } from "express";
import cors from 'cors';
import { join } from 'path';
import cookieParser from 'cookie-parser';

export const server: Express = express();
export const publicDir = join(__dirname, '..', 'public');

server
    .use(express.static(publicDir))
    .use(json())
    .use(cors())
    .use(cookieParser())