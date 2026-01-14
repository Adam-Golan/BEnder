
// Wrapper to make Fastify plugins compatible with BaseFramework's "factory" pattern
// BaseFramework calls: middleware(options)
// We return: (instance) => instance.register(plugin, options)

import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
// morgan not strictly needed or can be mocked? user removed it before.
// let's skip morgan or mock it.

export const cors = (options: any) => {
    return (instance: any) => {
        // FastifyAdapter.use(factoryResult) -> factoryResult(realFastifyInstance)
        // Check if instance is the Adapter or real instance?
        // Adapter.use receives this function.
        // Adapter.use can call it with this.instance
        if (instance.register) {
            instance.register(fastifyCors, options);
        }
    };
}

export const cookie = (options: any) => {
    return (instance: any) => {
        if (instance.register) {
            instance.register(fastifyCookie, options);
        }
    }
}

export const helmet = (options: any) => {
    return (instance: any) => {
        if (instance.register) {
            instance.register(fastifyHelmet, options);
        }
    }
}

export const rateLimit = (options: any) => {
    return (instance: any) => {
        if (instance.register) {
            instance.register(fastifyRateLimit, options);
        }
    }
}

export const staticFiles = (options: any) => {
    // static is special key in BaseFramework map, but here we wrap module.
    // NodeFramework does: import(middlewares.static...).
    // For fastify we'll point to this file.
    return (instance: any) => {
        if (instance.register) {
            instance.register(fastifyStatic, options);
        }
    }
}