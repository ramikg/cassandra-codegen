import {describe, expect, test} from "tstyche";
import {testMapper, TestRow, queryOperator} from "../../src";
import {mapperResult} from "../../src/types/mapper";

describe("Sanity type tests", () => {
    test("mapper.find()", () => {
        expect(testMapper.find({partitionKey1: ''})).type.toRaiseError();
        expect(testMapper.find({partitionKey1: '', clustering1: ''})).type.toRaiseError();
        expect(testMapper.find({partitionKey1: '', partitionKey2: 0})).type.toRaiseError();

        expect(testMapper.find({partitionKey1: '', partitionKey2: ''})).type.toBe<Promise<mapperResult<TestRow>>>();
        expect(testMapper.find({partitionKey1: '', partitionKey2: '', clustering1: ''})).type.toBe<Promise<mapperResult<TestRow>>>();
    });

    test("mapper.get()", () => {
        expect(testMapper.get({partitionKey1: '', partitionKey2: ''})).type.toRaiseError();
        expect(testMapper.get({partitionKey1: '', partitionKey2: '', clustering1: ''})).type.toRaiseError();
        expect(testMapper.get({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: '', extraColumn1: ''})).type.toRaiseError();
        expect(testMapper.get({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: 0})).type.toRaiseError();

        expect(testMapper.get({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: ''})).type.toBe<Promise<Required<TestRow> | null>>();
    });

    test("mapper.insert()", () => {
        expect(testMapper.insert({partitionKey1: '', partitionKey2: ''})).type.toRaiseError();
        expect(testMapper.insert({partitionKey1: '', partitionKey2: '', clustering1: ''})).type.toRaiseError();
        expect(testMapper.insert({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: 0})).type.toRaiseError();

        expect(testMapper.insert({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: ''})).type.toBe<Promise<mapperResult<TestRow>>>();
        expect(testMapper.insert({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: '', extraColumn1: ''})).type.toBe<Promise<mapperResult<TestRow>>>();
    });

    test("mapper.update()", () => {
        expect(testMapper.update({partitionKey1: '', partitionKey2: ''})).type.toRaiseError();
        expect(testMapper.update({partitionKey1: '', partitionKey2: '', clustering1: ''})).type.toRaiseError();
        expect(testMapper.update({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: 0})).type.toRaiseError();

        expect(testMapper.update({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: ''})).type.toBe<Promise<mapperResult<TestRow>>>();
        expect(testMapper.update({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: '', extraColumn1: ''})).type.toBe<Promise<mapperResult<TestRow>>>();
    });

    test("mapper.remove()", () => {
        expect(testMapper.remove({partitionKey1: '', partitionKey2: ''})).type.toRaiseError();
        expect(testMapper.remove({partitionKey1: '', partitionKey2: '', clustering1: ''})).type.toRaiseError();
        expect(testMapper.remove({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: '', extraColumn1: ''})).type.toRaiseError();
        expect(testMapper.remove({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: 0})).type.toRaiseError();

        expect(testMapper.remove({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: ''})).type.toBe<Promise<mapperResult<TestRow>>>();
    });
});

describe("Query operators", () => {
    test("Sanity", () => {
        expect(testMapper.get({partitionKey1: '', partitionKey2: '', clustering1: queryOperator.gte('')})).type.toRaiseError();
        expect(testMapper.get({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: queryOperator.gte(0)})).type.toRaiseError();

        expect(testMapper.get({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: queryOperator.gte('')})).type.toBe<Promise<Required<TestRow> | null>>();

        expect(testMapper.find({partitionKey1: '', partitionKey2: queryOperator.in_([0, 1])})).type.toRaiseError();

        expect(testMapper.find({partitionKey1: '', partitionKey2:  queryOperator.in_(['', '0']) })).type.toBe<Promise<mapperResult<TestRow>>>();
    });
})