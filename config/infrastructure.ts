import express, { Express, json } from "express";
import cors from 'cors';
import { join } from 'path';
import cookieParser from 'cookie-parser';

export const server: Express = express();

server
    .use(express.static(join(__dirname, '..', 'public')))
    .use(json())
    .use(cors())
    .use(cookieParser())