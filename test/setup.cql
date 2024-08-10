CREATE KEYSPACE IF NOT EXISTS test
    WITH REPLICATION = {
        'class' : 'SimpleStrategy',
        'replication_factor' : 1
    }
;

USE test;

CREATE TABLE IF NOT EXISTS test (
    partition_key1 text,
    partition_key2 text,
    clustering1 text,
    clustering2 text,
    extra_column1 text,
    extra_column2 text,

    PRIMARY KEY ((partition_key1, partition_key2), clustering1, clustering2)
);
