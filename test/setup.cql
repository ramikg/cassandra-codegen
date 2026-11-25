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

CREATE TABLE IF NOT EXISTS table_options (
    id text PRIMARY KEY
) WITH comment = 'Non-default options */ with a comment terminator'
    AND default_time_to_live = 3600
    AND gc_grace_seconds = 3600
    AND compaction = {'class': 'LeveledCompactionStrategy'};
