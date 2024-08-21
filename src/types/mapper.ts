import {mapping} from "cassandra-driver";
import {PartitionKeyColumns, PrimaryKeyColumns} from "./utils";

export type mapperResult<T> = mapping.Result<Required<T>>;

export interface CodegenModelMapper<T> extends mapping.ModelMapper<T> {
    get(doc: PrimaryKeyColumns<T>, docInfo?: { fields?: string[] }, executionOptions?: string | mapping.MappingExecutionOptions): Promise<null | Required<T>>;

    find<U extends PartitionKeyColumns<T>>(doc: U, docInfo?: mapping.FindDocInfo, executionOptions?: string | mapping.MappingExecutionOptions): Promise<mapperResult<T>>;

    insert<U extends PrimaryKeyColumns<T>>(doc: U, docInfo?: mapping.InsertDocInfo, executionOptions?: string | mapping.MappingExecutionOptions): Promise<mapperResult<T>>;

    update<U extends PrimaryKeyColumns<T>>(doc: U, docInfo?: mapping.UpdateDocInfo, executionOptions?: string | mapping.MappingExecutionOptions): Promise<mapperResult<T>>;

    // Cassandra supports deletion by partition key columns, but cassandra-driver does not. See https://github.com/datastax/nodejs-driver/pull/421
    remove(doc: PrimaryKeyColumns<T>, docInfo?: mapping.RemoveDocInfo, executionOptions?: string | mapping.MappingExecutionOptions): Promise<mapperResult<T>>;
}
