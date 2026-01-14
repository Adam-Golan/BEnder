# Welcome to BEnder! 🧠

**BEnder** is a **Framework-Agnostic** TypeScript boilerplate featuring a brain-inspired architecture for rapid backend development. It uses a unique **Neuron/Synapse** pattern that enables intuitive, file-system-based routing, running seamlessly on **Node.js** and **Bun**.

---

## 🚀 Quick Start

### 1. Install Core Dependencies

```bash
npm install
```

### 2. Install Framework Dependencies

Install your framework (BEnder detects them automatically):

#### 🟢 Node + 🥯 Bun

**Fastify**
```bash
*(Node)*
npm install fastify @fastify/static @fastify/cors @fastify/helmet @fastify/rate-limit @fastify/cookie

*(Bun)*
bun add fastify @fastify/static @fastify/cors @fastify/helmet @fastify/rate-limit @fastify/cookie
```

**Express**
```bash
*(Node)*
npm install express @types/express cors helmet morgan cookie-parser express-rate-limit

*(Bun)*
bun add express @types/express cors helmet morgan cookie-parser express-rate-limit
```

**Koa**
```bash
*(Node)*
npm install koa @koa/router koa-bodyparser @koa/cors koa-helmet koa-morgan koa-static koa-ratelimit @types/koa

*(Bun)*
bun add koa @koa/router koa-bodyparser @koa/cors koa-helmet koa-morgan koa-static koa-ratelimit @types/koa
```

**Hono**
*(Note: To run Hono on Node.js, install `@hono/node-server`)*
```bash
*(Node)*
npm install hono @hono/node-server hono-rate-limiter

*(Bun)*
bun add hono @hono/node-server hono-rate-limiter
```

#### 🥯 Bun

**Elysia**
*(Note: Elysia is only available for Bun)*
```bash
bun add elysia @elysiajs/static @elysiajs/cors @elysiajs/cookie @elysiajs/html @elysiajs/logger @elysiajs/limit
```

### 3. Run the Server

**Node.js**:
```bash
npm start
```

**Bun**:
```bash
bun run app.ts
```

The server will start on the port specified in your `.env` file (default: 3000).

---

## 🏗️ Architecture Overview

BEnder organizes routes using a **brain-inspired metaphor**:

- **Neurons** 🧠 - Container classes that automatically discover and organize routes (Directories).
- **Synapses** ⚡ - Endpoint handlers that process HTTP requests (Files).

### Reserved Prefixes

Files and directories prefixed with `_` (underscore) are **ignored** by the route discovery system, allowing for co-located helpers and tests.

### How Routing Works

Routes are automatically constructed from the **file system structure**:

```
methods/GET/              ← HTTP method (Neuron)
  ├── api/                ← Path segment: /api
  │   └── API.ts          ← Synapse handles: GET /api
  └── db/                 ← Path segment: /db
      └── DB.ts           ← Synapse handles: GET /db
```

**Result**: `GET /api` automatically routes to `methods/GET/api/API.ts`.

---

## 📁 Project Structure

```
BEnder/
├── app.ts                    # Entry point - detects runtime & framework
├── app.config.ts             # Centralized app configuration
├── .env                      # Environment variables
│
├── config/                   # Configuration layer
│   └── infrastructure.ts     # Framework + middleware handling (Agnostic)
│
├── methods/                  # HTTP method handlers (Neurons)
│   ├── base.ts               # Neuron & Synapse base classes ⭐
│   ├── GET/                  # GET requests
│   └── ...                   # POST, PUT, DELETE, etc.
│
├── apps/                     # Business logic
└── public/                   # Static files
```

---

## 🧠 Creating Synapses (Routes)

A **Synapse** is an endpoint handler that processes requests using the unified `IRequest` and `IResponse` interfaces.

### Example: `methods/POST/users/Create.ts`

```typescript
import { Synapse } from '../../base';
import { IRequest, IResponse } from '../../../config/server/types';

export class CreateUser extends Synapse {
    constructor() {
        super(__dirname);
    }
    
    protected async setRouter(): Promise<void> {
        // Use the agnostic helper or access this.router directly
        this.router.post('/create', async (req: IRequest, res: IResponse) => {
            const { code, data } = await this.tryer(async () => {
                // Business logic...
                return { id: 1, name: req.body.name };
            });
            this.responser(res, code, data);
        });
    }
}
```

**Key Features:**
- **Framework Agnostic**: Code works on Express, Fastify, Hono, and Elysia without changes.
- **Unified Types**: `IRequest<Body, Query, Params>` and `IResponse`.
- **Async Error Handling**: `tryer()` wraps logic with auto-logging.

---

## ⚙️ Configuration & Database

- **Config**: Edit `app.config.ts` for CORS, Security, Rate Limits, and DB settings.
- **Database**: Supports SQL, NoSQL, Graph, etc. Implement connection logic in `config/infrastructure.ts`.

---

## 🛡️ Security Features

BEnder automatically applies security middleware based on current framework:

- ✅ **Helmet / Secure Headers**
- ✅ **CORS**
- ✅ **Rate Limiting**
- ✅ **Cookie Parser**
- ✅ **Morgan / Logger**

All configured via `app.config.ts`.

---

## 📚 Supported Frameworks

| Runtime | Frameworks | Status |
|---------|------------|--------|
| **Both** | Fastify | ✅ Verified |
| **Both** | Express | ✅ Verified |
| **Both** | Koa     | ✅ Ready for Verification |
| **Both**     | Hono    | ✅ Verified |
| **Bun**     | Elysia  | ✅ Verified |

---

**Built with ❤️ for rapid backend development**