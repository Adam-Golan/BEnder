# Backend Boilerplate

### Starting up

1. Run `npm i`
1. Run `npm run server`

### Configuration

1. [Environment vars](./config/keys.ts)
1. [Server infrastructure](./config/infrastructure.ts)

### Methodology

The server is built like a dynamic brain, you have two base classes: [`Synapse` & `Neuron`](./methods/base.ts).
If you want to create the path `path/to/here`, you'll have to extend your classes using the bases like such `path(Neuron)/to(Neuron)/here(Synapse)`, follow the abstract implemetations and you'll get it in no time.
[See example here](./methods/GET/GET.ts) [and here](./methods/GET/api/API.ts).
