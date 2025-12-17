import { RuntimeType } from "./types";
import { BaseFramework } from "./frameworks/Base";
import { BunFramework } from "./frameworks/bun/bunFramework";
import { NodeFramework } from "./frameworks/node/nodeFramework";

function detectRuntime(): RuntimeType {
    if (process.versions.bun) return 'bun';
    if (process.versions.node) return 'node';
    throw new Error('Unsupported runtime');
}

export async function initServer(): Promise<BaseFramework<any>> {
    return await (detectRuntime() === 'bun' ? new BunFramework(['hono', 'elysia']).init() : new NodeFramework(['express', 'fastify']).init());
}
