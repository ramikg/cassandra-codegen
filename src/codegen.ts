import {Client, mapping} from 'cassandra-driver';
import {ModuleKind, Node, Project, SourceFile, StructureKind, VariableDeclarationKind} from 'ts-morph';
import {lowerFirst, upperFirst} from 'lodash';
import {cassandraTypeToTsType} from "./cassandra-types";
import {basename, extname, join, resolve} from "path";

type CassandraColumnInfo = {
    column_name: string,
    clustering_order: 'ASC' | 'DESC' | 'NONE',
    kind: 'partition_key' | 'clustering' | 'regular',
    position: number,
    type: string,
};

const DEFAULT_GENERATED_FILENAME = 'generated.ts';
const MAPPINGS_OBJECT_VARIABLE_NAME = 'mappingsObject';

const PACKAGE_SRC_DIR = join(__dirname, '..', 'src');
const STANDALONE_INLINED_FILES = ['types/utils.ts', 'types/mapper.ts', 'query-operator.ts'];

const underscoreCqlToCamelCaseMappingsObject = new mapping.UnderscoreCqlToCamelCaseMappings();

function snakeCaseToCamelCase(s: string) {
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
    outputFile?: string
) {
    const startTime = performance.now();

    const tableNames = await getTableNames(client, keyspaceName);
    if (!tableNames.length) {
        console.warn(`Keyspace ${keyspaceName} has no tables. Nothing to generate.`);
        return;
    }

    if (outputFile !== undefined && extname(outputFile) !== '.ts') {
        throw new Error(`--output-file must be a .ts file, got ${outputFile}`);
    }

    const tsMorphProject = new Project({compilerOptions: {
        outDir: outputDir,
        declaration: true,
        sourceMap: true,
        module: ModuleKind.CommonJS,
    }});
    const sourceFilePath = outputFile !== undefined ? resolve(outputFile) : join(outputDir, DEFAULT_GENERATED_FILENAME);
    const sourceFile = tsMorphProject.createSourceFile(sourceFilePath, {}, {overwrite: true});

    if (outputFile !== undefined) {
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

    for (const tableName of tableNames) {
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

    if (outputFile !== undefined) {
        sourceFile.insertText(0, '// Generated by cassandra-codegen. Do not edit: regenerate it instead.\n\n');
    }

    if (outputFile !== undefined || generateTsFile) {
        await tsMorphProject.save();
    } else {
        await tsMorphProject.emit();
    }

    const pluralSuffix = tableNames.length === 1 ? '' : 's';
    const timeTookInMs = Math.round(performance.now() - startTime);
    const outputPath = outputFile !== undefined
        ? sourceFilePath
        : join(outputDir, basename(DEFAULT_GENERATED_FILENAME, '.ts')) + (generateTsFile ? '.ts' : '.{js, d.ts}');
    console.log(`✓ Introspected ${tableNames.length} table${pluralSuffix} and generated ${outputPath} in ${timeTookInMs}ms.`);
}
