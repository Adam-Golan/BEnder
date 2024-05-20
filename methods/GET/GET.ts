import { Neuron } from "../base";
import { GET_API } from './api/API';
import { GET_DB } from './db/DB';

export class GET extends Neuron {
    routes = {
        api: GET_API,
        db: GET_DB
    };
}