import { BaseFramework } from "./frameworks/Base";
import { BunFramework } from "./frameworks/BunFramework";
import { NodeFramework } from "./frameworks/NodeFramework";
import { RuntimeType } from "./types";

function isInstalled(name: string): boolean {
    try { require.resolve(name); return true; } catch { return false; }
}

function detectRuntime(): RuntimeType {
    if (process.versions.bun) return 'bun';
    if (process.versions.node) return 'node';
    throw new Error('Unsupported runtime');
}

export async function initServer(): Promise<BaseFramework<any>> {
    // Priority: Hono > Fastify > Koa > Express
    // Hono runs on Node (via @hono/node-server) and Bun perfectly.
    // Express/Fastify/Koa run on Bun perfectly.

    if (isInstalled('hono')) return new BunFramework(['hono', 'elysia']).init();
    if (isInstalled('elysia') && detectRuntime() === 'bun') return new BunFramework(['hono', 'elysia']).init();
    if (isInstalled('elysia') && detectRuntime() === 'node') throw new Error('Elysia is not supported on Node.js');
    return new NodeFramework(['fastify', 'express', 'koa']).init();
}
