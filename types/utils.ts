export type PartitionKey<T> = T & {__partitionKey: never};

type ClusteringOrder = 'ASC' | 'DESC';
export type Clustering<T, ClusteringOrder> = T & {__clustering: never};

// Type utils taken from Kysely
type IfNotNever<T, K> = T extends never ? never : K;
// DrainOuterGeneric seems to produce better type hints
export type DrainOuterGeneric<T> = [T] extends [unknown] ? T : never

export type PartitionKeyType<T> = T extends PartitionKey<infer U> ? U : never;
export type PrimaryKeyType<T> = T extends (PartitionKey<infer U> | Clustering<infer U, any>) ? U : never;

type NonNeverPartitionKeys<T> = {
    [K in keyof T]: IfNotNever<PartitionKeyType<T[K]>, K>
}[keyof T];

type NonNeverPrimaryKeys<T> = {
    [K in keyof T]: IfNotNever<PrimaryKeyType<T[K]>, K>
}[keyof T];

export type PartitionKeyColumns<T> = DrainOuterGeneric<{
    [K in NonNeverPartitionKeys<T>]: PartitionKeyType<T[K]>
}>;

export type PrimaryKeyColumns<T> = DrainOuterGeneric<{
    [K in NonNeverPrimaryKeys<T>]: PrimaryKeyType<T[K]>
}>;
