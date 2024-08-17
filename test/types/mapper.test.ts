import {describe, expect, test} from "tstyche";
import {mapping} from "cassandra-driver";
import {testMapper, TestRow} from "../../types/generated";

describe("Sanity type tests", () => {
    test("mapper.find()", () => {
        expect(testMapper.find({partitionKey1: ''})).type.toRaiseError();
        expect(testMapper.find({partitionKey1: '', clustering1: ''})).type.toRaiseError();
        expect(testMapper.find({partitionKey1: '', partitionKey2: 0})).type.toRaiseError();

        expect(testMapper.find({partitionKey1: '', partitionKey2: ''})).type.toBe<Promise<mapping.Result<TestRow>>>;
        expect(testMapper.find({partitionKey1: '', partitionKey2: '', clustering1: ''})).type.toBe<Promise<mapping.Result<TestRow>>>;
    });

    test("mapper.get()", () => {
        expect(testMapper.get({partitionKey1: '', partitionKey2: ''})).type.toRaiseError();
        expect(testMapper.get({partitionKey1: '', partitionKey2: '', clustering1: ''})).type.toRaiseError();
        expect(testMapper.get({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: '', extraColumn1: ''})).type.toRaiseError();
        expect(testMapper.get({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: 0})).type.toRaiseError();

        expect(testMapper.get({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: ''})).type.toBe<Promise<TestRow | null>>;
    });

    test("mapper.insert()", () => {
        expect(testMapper.insert({partitionKey1: '', partitionKey2: ''})).type.toRaiseError();
        expect(testMapper.insert({partitionKey1: '', partitionKey2: '', clustering1: ''})).type.toRaiseError();
        expect(testMapper.insert({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: 0})).type.toRaiseError();

        expect(testMapper.insert({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: ''})).type.toBe<Promise<mapping.Result<TestRow>>>;
        expect(testMapper.insert({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: '', extraColumn1: ''})).type.toBe<Promise<mapping.Result<TestRow>>>;
    });

    test("mapper.update()", () => {
        expect(testMapper.update({partitionKey1: '', partitionKey2: ''})).type.toRaiseError();
        expect(testMapper.update({partitionKey1: '', partitionKey2: '', clustering1: ''})).type.toRaiseError();
        expect(testMapper.update({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: 0})).type.toRaiseError();

        expect(testMapper.update({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: ''})).type.toBe<Promise<mapping.Result<TestRow>>>;
        expect(testMapper.update({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: '', extraColumn1: ''})).type.toBe<Promise<mapping.Result<TestRow>>>;
    });

    test("mapper.remove()", () => {
        expect(testMapper.remove({partitionKey1: '', partitionKey2: ''})).type.toRaiseError();
        expect(testMapper.remove({partitionKey1: '', partitionKey2: '', clustering1: ''})).type.toRaiseError();
        expect(testMapper.remove({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: '', extraColumn1: ''})).type.toRaiseError();
        expect(testMapper.remove({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: 0})).type.toRaiseError();

        expect(testMapper.remove({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: ''})).type.toBe<Promise<mapping.Result<TestRow>>>;
    });
});