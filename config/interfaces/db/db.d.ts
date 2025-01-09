
export interface DBConfig {
    type: 'sql' | 'nosql' | 'cloud' | 'graph' | 'timeseries' | 'document' | 'keyvalue';
    sql?: SqlDB;
    nosql?: NoSqlDB;
    cloud?: CloudDB;
    graph?: GraphDB;
    timeseries?: TimeSeries;
    document?: DocumentDB;
    keyvalue?: KeyvalueDB;
}

interface BaseDB {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
}

interface SqlDB extends BaseDB {
    type: 'mysql' | 'postgres' | 'mssql' | 'oracle';
}

interface NoSqlDB extends BaseDB {
    type: 'mongodb' | 'cassandra' | 'redis' | 'couchbase';
}

interface CloudDB extends Omit<BaseDB, 'host' | 'port'> {
    type: 'aws' | 'gcp' | 'azure';
    region: string;
    instance: string;
}

interface GraphDB extends BaseDB {
    type: 'neo4j' | 'amazon-neptune' | 'tigergraph';
}

interface TimeSeries extends BaseDB {
    type: 'influxdb' | 'opentsdb' | 'timescale';
}

interface DocumentDB extends BaseDB {
    type: 'mongodb' | 'couchbase' | 'ravendb';
}

interface KeyvalueDB extends BaseDB {
    type: 'redis' | 'riak' | 'amazon-dynamodb';
}