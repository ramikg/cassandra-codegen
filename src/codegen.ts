import {Client, mapping} from 'cassandra-driver';
import {Project, StructureKind, VariableDeclarationKind} from 'ts-morph';
import {upperFirst} from 'lodash';
import {cassandraTypeToTsType} from "./cassandra-types";
import {join} from "path";

type CassandraColumnInfo = {
    column_name: string,
    clustering_order: 'ASC' | 'DESC' | 'NONE',
    kind: 'partition_key' | 'clustering' | 'regular',
    position: number,
    type: string,
};

const DEFAULT_GENERATED_FILENAME = 'generated.ts';
const MAPPINGS_OBJECT_VARIABLE_NAME = 'mappingsObject';

const underscoreCqlToCamelCaseMappingsObject = new mapping.UnderscoreCqlToCamelCaseMappings();

function camelCase(s: string) {
    // The cassandra-driver implementation is slightly different from that of Lodash.
    // Also, it assumes that the input is in snake case, which is why we convert it to lowercase.
    return underscoreCqlToCamelCaseMappingsObject.getPropertyName(s.toLowerCase());
}

async function getTableNames(client: Client, keyspaceName: string): Promise<string[]> {
    const query = 'SELECT table_name FROM system_schema.tables WHERE keyspace_name = ?';
    const result = await client.execute(query, [keyspaceName]);
    return result.rows.map(row => row.table_name);
}

async function getTableColumns(client: Client, keyspaceName: string, tableName: string): Promise<CassandraColumnInfo[]> {
    const query = 'SELECT * FROM system_schema.columns WHERE keyspace_name = ? AND table_name = ?';
    const columns = (await client.execute(query, [keyspaceName, tableName])).rows as unknown as CassandraColumnInfo[];
    return columns
        .sort((a, b) => a.position - b.position)
        .sort((a, b) => a.kind === b.kind ? 0 : a.kind === 'partition_key' || (a.kind === 'clustering' && b.kind === 'regular') ? -1 : 1);
}

export async function generateTypeScriptDefinitions(
    client: Client,
    keyspaceName: string,
    outputDir: string,
    typeNameSuffix: string,
    generateTsFile: boolean,
    useJsMap: boolean,
    useJsSet: boolean
) {
    const tableNames = await getTableNames(client, keyspaceName);
    if (!tableNames.length) {
        console.warn(`Keyspace ${keyspaceName} has no tables. Nothing to generate.`);
        return;
    }

    const tsMorphProject = new Project({compilerOptions: {outDir: outputDir, declaration: true, 'sourceMap': true}});
    const sourceFile = tsMorphProject.createSourceFile(join(outputDir, DEFAULT_GENERATED_FILENAME), {}, {overwrite: true});

    sourceFile.addImportDeclarations([
        {
            namedImports: ['PartitionKey', 'Clustering'],
            moduleSpecifier: './utils',
        },
        {
            namedImports: ['CodegenModelMapper'],
            moduleSpecifier: './mapper',
        },
        {
            namedImports: ['Client', 'mapping', 'types'],
            moduleSpecifier: 'cassandra-driver',
        }
    ]);

    for (const tableName of tableNames) {
        const columns = await getTableColumns(client, keyspaceName, tableName);

        const interfaceDeclaration = sourceFile.addInterface({
            name: upperFirst(camelCase(tableName) + typeNameSuffix),
            isExported: true,
        });

        columns.forEach(column => {
            let tsType = cassandraTypeToTsType(column.type, useJsMap, useJsSet);

            if (column.kind === 'partition_key') {
                tsType = `PartitionKey<${tsType}>`;
            } else if (column.kind === 'clustering') {
                tsType = `Clustering<${tsType}, '${column.clustering_order}'>`;
            }

            interfaceDeclaration.addProperty({
                name: camelCase(column.column_name),
                type: tsType,
            });
        });

        sourceFile.addVariableStatement({
            declarationKind: VariableDeclarationKind.Let,
            declarations: [{
                name: camelCase(tableName) + 'Mapper',
                type: `CodegenModelMapper<${interfaceDeclaration.getName()}>`,
            }],
            isExported: true,
        });

        console.log(`Generated type & mapper for table "${tableName}"`);
    }

    sourceFile.addVariableStatement({
        declarationKind: VariableDeclarationKind.Const,
        declarations: [{
            name: MAPPINGS_OBJECT_VARIABLE_NAME,
            initializer: 'new mapping.UnderscoreCqlToCamelCaseMappings()'
        }],
    });

    sourceFile.addFunction({
        name: 'initMappers',
        isExported: true,
        isAsync: true,
        parameters: [
            {
                name: 'client',
                type: 'Client',
            }
        ],
        statements: [
            {
                kind: StructureKind.VariableStatement,
                declarationKind: VariableDeclarationKind.Const,
                declarations: [{
                    name: 'mapper',
                    initializer: writer => {
                        writer.writeLine('new mapping.Mapper(client, {');
                        writer.writeLine('models: {');
                        writer.setIndentationLevel(1);
                        tableNames.forEach(tableName => {
                            const modelName = upperFirst(camelCase(tableName));
                            writer.writeLine(`'${modelName}': { tables: ['${tableName}'], mappings: ${MAPPINGS_OBJECT_VARIABLE_NAME} },`);
                        });
                        writer.setIndentationLevel(0);
                        writer.writeLine('}})');
                    },
                }],
            },
            writer => {
                tableNames.forEach(table => {
                    const modelName = upperFirst(camelCase(table));
                    const mapperName = camelCase(`${modelName}`) + 'Mapper';
                    writer.writeLine(`${mapperName} = mapper.forModel('${modelName}');`);
                });
            }
        ],
    });

    if (generateTsFile) {
        await tsMorphProject.save();
    } else {
        await tsMorphProject.emit();
    }
}
