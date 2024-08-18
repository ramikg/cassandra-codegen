import {Client} from "cassandra-driver";
import {initMappers, testMapper, queryOperator} from "../src";

let client: Client;

beforeAll(async () => {
    client = new Client({
        contactPoints: [`localhost`],
        localDataCenter: 'datacenter1',
        keyspace: 'test',
    });
    await client.connect();

    await initMappers(client);
});

afterAll(async () => {
    await client.shutdown();
})

describe("Functional", () => {
    test("Sanity", async () => {
        const primaryKey = {partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: ''};
        const testRow = {
            extraColumn1: '',
            extraColumn2: '',
            ...primaryKey,
        };

        await testMapper.insert(testRow);
        expect(await testMapper.get(primaryKey)).toEqual(testRow);
    });

    test("Query operators sanity", async () => {
        const testRow = {
            partitionKey1: '',
            partitionKey2: '',
            clustering1: '',
            clustering2: '',
            extraColumn1: '',
            extraColumn2: '',
        };

        await testMapper.insert(testRow);

        const findResult = await testMapper.find({
            partitionKey1: testRow.partitionKey1,
            partitionKey2: queryOperator.in_([testRow.partitionKey2, testRow.partitionKey2 + '0']),
        });
        const foundRows = findResult.toArray();
        expect(foundRows.length).toBe(1);
        expect(foundRows[0]).toEqual(testRow);

        const findResult2 = await testMapper.find({
            partitionKey1: testRow.partitionKey1,
            partitionKey2: queryOperator.in_([testRow.partitionKey2 + '0']),
        });
        const foundRows2 = findResult2.toArray();
        expect(foundRows2.length).toBe(0);
    })
})
