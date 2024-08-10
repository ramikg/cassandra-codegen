import {Client} from "cassandra-driver";
import {initMappers, testMapper} from "../types/generated";

let client: Client;

beforeAll(async () => {
    client = new Client({
        contactPoints: [`localhost`],
        localDataCenter: 'datacenter1',
        keyspace: 'test',
    });
    await client.connect();
});

afterAll(async () => {
    await client.shutdown();
})

describe("Functional", () => {
    test("Sanity", async () => {
        await initMappers(client);

        const primaryKey = {partitionKey1: '', partitionKey2: '', clustering1: '', clustering2: ''};
        const testRow = {
            extraColumn1: '',
            extraColumn2: '',
            ...primaryKey,
        };

        await testMapper.insert(testRow);
        expect(await testMapper.get(primaryKey)).toEqual(testRow);
    })
})
