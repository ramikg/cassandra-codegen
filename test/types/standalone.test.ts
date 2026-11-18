import {describe, expect, test} from "tstyche";
import {testMapper, TestRow, queryOperator, mapperResult} from "../standalone/generated";

// The standalone --output-file inlines the package's types, so its mappers are exactly as type-safe
describe("Standalone output type tests", () => {
    test("mapper.get()", () => {
        expect(testMapper.get({partitionKey1: '', partitionKey2: '', clustering1: ''})).type.toRaiseError();
        expect(testMapper.get({partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: ''})).type.toBe<Promise<Required<TestRow> | null>>();
    });

    test("mapper.find()", () => {
        expect(testMapper.find({partitionKey1: ''})).type.toRaiseError();
        expect(testMapper.find({partitionKey1: '', partitionKey2: queryOperator.in_([0, 1])})).type.toRaiseError();
        expect(testMapper.find({partitionKey1: '', partitionKey2: queryOperator.in_(['', '0'])})).type.toBe<Promise<mapperResult<TestRow>>>();
    });
});
