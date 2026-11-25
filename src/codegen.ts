import {Client, mapping} from 'cassandra-driver';
import {ModuleKind, Node, Project, SourceFile, StructureKind, VariableDeclarationKind} from 'ts-morph';
import {lowerFirst, upperFirst} from 'lodash';
import {cassandraTypeToTsType} from "./cassandra-types";
import {basename, join} from "path";

type CassandraColumnInfo = {
    column_name: string,
    clustering_order: 'ASC' | 'DESC' | 'NONE',
    kind: 'partition_key' | 'clustering' | 'regular',
    position: number,
    type: string,
};

type CassandraTableInformation = {
    table_name: string,
    compaction: Record<string, string>,
    default_time_to_live: number,
    gc_grace_seconds: number,
    comment: string,
};

const DEFAULT_GENERATED_FILENAME = 'generated.ts';
const MAPPINGS_OBJECT_VARIABLE_NAME = 'mappingsObject';
const DEFAULT_TIME_TO_LIVE = 0;
const DEFAULT_GC_GRACE_SECONDS = 864000;

const PACKAGE_SRC_DIR = join(__dirname, '..', 'src');
const STANDALONE_INLINED_FILES = ['types/utils.ts', 'types/mapper.ts', 'query-operator.ts'];

const underscoreCqlToCamelCaseMappingsObject = new mapping.UnderscoreCqlToCamelCaseMappings();

function snakeCaseToCamelCase(s: string) {
    // The cassandra-driver implementation is slightly different from that of Lodash.
    // Also, it assumes that the input is in snake case, which is why we convert it to lowercase.
    return underscoreCqlToCamelCaseMappingsObject.getPropertyName(s.toLowerCase());
}

async function getTables(client: Client, keyspaceName: string): Promise<CassandraTableInformation[]> {
    const query = 'SELECT table_name, comment, compaction, default_time_to_live, gc_grace_seconds FROM system_schema.tables WHERE keyspace_name = ?';
    return (await client.execute(query, [keyspaceName])).rows as unknown as CassandraTableInformation[];
}

function getTableOptionsDocs(table: CassandraTableInformation): string {
    const compaction = Object.entries(table.compaction).map(([key, value]) => `'${key}': '${value}'`).join(', ');
    const lines = [
        `compaction: \`{${compaction}}\``,
        `default_time_to_live: ${table.default_time_to_live}${table.default_time_to_live === DEFAULT_TIME_TO_LIVE ? ' (default)' : ''}`,
        `gc_grace_seconds: ${table.gc_grace_seconds}${table.gc_grace_seconds === DEFAULT_GC_GRACE_SECONDS ? ' (default)' : ''}`,
    ];
    if (table.comment) {
        lines.push(`comment: ${table.comment}`);
    }
    // Indent continuation lines (of a multi-line comment) to keep them in their list item
    const listItems = lines.map(line => ` - ${line.replaceAll('\n', '\n   ')}`).join('\n');
    // A "*/" in the options would close the doc comment early
    return `/**\n${listItems.replaceAll('*/', '*\\/')}\n */\n`;
}

async function getTableColumns(client: Client, keyspaceName: string, tableName: string): Promise<CassandraColumnInfo[]> {
    const query = 'SELECT * FROM system_schema.columns WHERE keyspace_name = ? AND table_name = ?';
    const columns = (await client.execute(query, [keyspaceName, tableName])).rows as unknown as CassandraColumnInfo[];
    return columns
        .sort((a, b) => a.position - b.position)
        .sort((a, b) => a.kind === b.kind ? 0 : a.kind === 'partition_key' || (a.kind === 'clustering' && b.kind === 'regular') ? -1 : 1);
}

function inlinePackageSources(project: Project, sourceFile: SourceFile) {
    for (const relativePath of STANDALONE_INLINED_FILES) {
        const supportFile = project.addSourceFileAtPath(join(PACKAGE_SRC_DIR, relativePath));
        const statements = supportFile.getStatements()
            .filter(statement => !Node.isImportDeclaration(statement))
            .map(statement => statement.getText());
        sourceFile.addStatements(statements);
        project.removeSourceFile(supportFile);
    }
}

export async function generateTypeScriptDefinitions(
    client: Client,
    keyspaceName: string,
    outputDir: string,
    typeNameSuffix: string,
    generateTsFile: boolean,
    useJsMap: boolean,
    useJsSet: boolean,
    standaloneFilePath?: string
) {
    const startTime = performance.now();

    const tables = await getTables(client, keyspaceName);
    if (!tables.length) {
        console.warn(`Keyspace ${keyspaceName} has no tables. Nothing to generate.`);
        return;
    }
    const tableNames = tables.map(table => table.table_name);

    const tsMorphProject = new Project({compilerOptions: {
        outDir: outputDir,
        declaration: true,
        sourceMap: true,
        module: ModuleKind.CommonJS,
    }});
    const sourceFilePath = standaloneFilePath || join(outputDir, DEFAULT_GENERATED_FILENAME);
    const sourceFile = tsMorphProject.createSourceFile(sourceFilePath, {}, {overwrite: true});

    if (standaloneFilePath) {
        sourceFile.addImportDeclaration({
            namedImports: ['Client', 'mapping', 'types'],
            moduleSpecifier: 'cassandra-driver',
        });
        inlinePackageSources(tsMorphProject, sourceFile);
    } else {
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
    }

    for (const table of tables) {
        const tableName = table.table_name;
        const columns = await getTableColumns(client, keyspaceName, tableName);

        const interfaceDeclaration = sourceFile.addInterface({
            name: upperFirst(snakeCaseToCamelCase(tableName) + typeNameSuffix),
            isExported: true,
        });

        columns.forEach(column => {
            let tsType = cassandraTypeToTsType(column.type, useJsMap, useJsSet);

            const isPartOfPrimaryKey = ['partition_key', 'clustering'].includes(column.kind);
            if (isPartOfPrimaryKey) {
                if (column.kind === 'partition_key') {
                    tsType = `PartitionKey<${tsType}>`;
                } else if (column.kind === 'clustering') {
                    tsType = `Clustering<${tsType}, '${column.clustering_order}'>`;
                }
            } else {
                tsType += ' | null';
            }

            interfaceDeclaration.addProperty({
                name: snakeCaseToCamelCase(column.column_name),
                type: tsType,
                hasQuestionToken: !isPartOfPrimaryKey,
            });
        });

        sourceFile.addVariableStatement({
            leadingTrivia: getTableOptionsDocs(table),
            declarationKind: VariableDeclarationKind.Let,
            declarations: [{
                name: snakeCaseToCamelCase(tableName) + 'Mapper',
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
                            const modelName = upperFirst(snakeCaseToCamelCase(tableName));
                            writer.writeLine(`'${modelName}': { tables: ['${tableName}'], mappings: ${MAPPINGS_OBJECT_VARIABLE_NAME} },`);
                        });
                        writer.setIndentationLevel(0);
                        writer.writeLine('}})');
                    },
                }],
            },
            writer => {
                tableNames.forEach(tableName => {
                    const modelName = upperFirst(snakeCaseToCamelCase(tableName));
                    const mapperName = lowerFirst(modelName) + 'Mapper';
                    writer.writeLine(`${mapperName} = mapper.forModel('${modelName}') as CodegenModelMapper<${modelName}${typeNameSuffix}>;`);
                });
            }
        ],
    });

    if (standaloneFilePath) {
        sourceFile.insertText(0, '// This file is generated by cassandra-codegen.\n\n');
    }

    if (standaloneFilePath || generateTsFile) {
        await tsMorphProject.save();
    } else {
        await tsMorphProject.emit();
    }

    const pluralSuffix = tableNames.length === 1 ? '' : 's';
    const timeTookInMs = Math.round(performance.now() - startTime);
    const outputPath = standaloneFilePath
        ? sourceFilePath
        : join(outputDir, basename(DEFAULT_GENERATED_FILENAME, '.ts')) + (generateTsFile ? '.ts' : '.{js, d.ts}');
    console.log(`✓ Introspected ${tableNames.length} table${pluralSuffix} and generated ${outputPath} in ${timeTookInMs}ms.`);
}
