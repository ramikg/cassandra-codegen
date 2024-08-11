# Cassandra Codegen

Generate TypeScript type definitions from a Cassandra (or ScyllaDB) database, as well as type-safe mappers.

Inspired by [kysely-codegen](https://github.com/RobinBlomberg/kysely-codegen).

## Example output

<table>
<tr>
<td>Existing Cassandra table</td> <td>Resulting TypeScript type</td>
</tr>
<tr>
<td>

```cassandraql
CREATE TABLE cyclist_category (
    category text,
    points int,
    id UUID,
    lastname text,
    PRIMARY KEY (category, points)
) WITH CLUSTERING ORDER BY (points DESC);
```

</td>
<td>

```typescript
export interface CyclistCategoryRow {
    category: PartitionKey<string>;
    points: Clustering<number, 'desc'>;
    id: types.Uuid;
    lastname: string;
}
```

</td>
</tr>
</table>

Additionally, a mapper named `cyclistCategoryMapper` is generated, which is similar to the mapper provided by `cassandra-driver`, but is more type-safe due to the type annotations specifying partition key & clustering columns.

## Usage instructions

1. Install using `npm install cassandra-codegen`.
2. In your project, run:
   ```
   cassandra-codegen --host <host> --port <port> --datacenter <datacenter> --username <username> --password <password> --keyspace <keyspace>
   ```
   
   Notes:
   - Run `cassandra-codegen -h` for extra CLI options.
   - You may have to run `npm exec cassandra-codegen -- args`, depending on your environment.

3. In your code (usually inside some `init` function), add the following call:
   ```typescript
   import { initMappers } from "cassandra-codegen";

   // The argument should be a connected `cassandra-driver` client. 
   await initMappers(cassandra);
   ```
4. You can now use the generated mappers wherever you need them:
   ```typescript
   import { cyclistCategoryMapper } from "cassandra-codegen";
   
   const cyclistCategory = await cyclistCategoryMapper.get({...});
   ```
