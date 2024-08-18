import {mapping} from "cassandra-driver";
import {PartitionKeyColumns, PrimaryKeyColumns} from "./utils";

export interface CodegenModelMapper<T> extends mapping.ModelMapper<T> {
    get(doc: PrimaryKeyColumns<T>, docInfo?: { fields?: string[] }, executionOptions?: string | mapping.MappingExecutionOptions): Promise<null | T>;

    find<U extends PartitionKeyColumns<T>>(doc: U, docInfo?: mapping.FindDocInfo, executionOptions?: string | mapping.MappingExecutionOptions): Promise<mapping.Result<T>>;

    insert<U extends PrimaryKeyColumns<T>>(doc: U, docInfo?: mapping.InsertDocInfo, executionOptions?: string | mapping.MappingExecutionOptions): Promise<mapping.Result<T>>;

    update<U extends PrimaryKeyColumns<T>>(doc: U, docInfo?: mapping.UpdateDocInfo, executionOptions?: string | mapping.MappingExecutionOptions): Promise<mapping.Result<T>>;

    // Cassandra supports deletion by partition key columns, but cassandra-driver does not. See https://github.com/datastax/nodejs-driver/pull/421
    remove(doc: PrimaryKeyColumns<T>, docInfo?: mapping.RemoveDocInfo, executionOptions?: string | mapping.MappingExecutionOptions): Promise<mapping.Result<T>>;
}
