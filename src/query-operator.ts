import {mapping} from "cassandra-driver";
import {CodegenQueryOperator} from "./types/utils";

export const queryOperator = {
    // Not the actual return type. This is an ugly hack to squeeze type-safety out of the third party QueryOperator functions.
    in_: function in_<T>(arr: T[]): CodegenQueryOperator<T> {
        return mapping.q.in_(arr) as any;
    },

    gt: function gt<T>(value: T): CodegenQueryOperator<T>{
        return mapping.q.gt(value) as any;
    },

    gte: function gte<T>(value: T): CodegenQueryOperator<T>{
        return mapping.q.gte(value) as any;
    },

    lt: function lt<T>(value: T): CodegenQueryOperator<T>{
        return mapping.q.lt(value) as any;
    },

    lte: function lte<T>(value: T): CodegenQueryOperator<T>{
        return mapping.q.lte(value) as any;
    },

    notEq: function notEq<T>(value: T): CodegenQueryOperator<T>{
        return mapping.q.notEq(value) as any;
    },

    and: function and<T>(condition1: CodegenQueryOperator<T>, condition2: CodegenQueryOperator<T>): CodegenQueryOperator<T>{
        return mapping.q.and(condition1, condition2) as any;
    },

    incr: function incr<T>(value: T): CodegenQueryOperator<T>{
        return mapping.q.incr(value) as any;
    },

    decr: function decr<T>(value: T): CodegenQueryOperator<T>{
        return mapping.q.decr(value) as any;
    },

    append: function append<T>(value: T): CodegenQueryOperator<T>{
        return mapping.q.append(value) as any;
    },

    prepend: function prepend<T>(value: T): CodegenQueryOperator<T>{
        return mapping.q.prepend(value) as any;
    },

    remove: function remove<T>(value: T): CodegenQueryOperator<T>{
        return mapping.q.remove(value) as any;
    },
}
