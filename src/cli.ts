#!/usr/bin/env node

import {Command, InvalidArgumentError, Option} from "commander";
import {Client} from "cassandra-driver";
import {generateTypeScriptDefinitions} from "./codegen";
import {extname, join} from "path";

const parseTsFilePath = (value: string) => {
    if (extname(value) !== '.ts') {
        throw new InvalidArgumentError('Must be a .ts file.');
    }
    return value;
}

const parseArgs = () => {
    const program = new Command();

    const defaultOutputDir = join(process.cwd(), 'node_modules', 'cassandra-codegen', 'dist', 'types');

    program.name('cassandra-codegen')
        .description('Generate type definitions from a Cassandra database')
        .requiredOption('--host <host>', 'The Cassandra DB hostname or IP address')
        .option('--port <port>', 'The Cassandra DB port (optional)')
        .requiredOption('--datacenter <datacenter>', 'The Cassandra DB datacenter name')
        .option('--username <username>', 'The Cassandra DB username (optional)')
        .option('--password <password>', 'The Cassandra DB password (optional)')
        .requiredOption('--keyspace <keyspace>', 'The keyspace of the tables for which to generate type definitions')
        .option('--type-suffix <typeSuffix>', 'A suffix to add to the generated type names', 'Row')
        .option('--generate-ts-file', 'Generate a .ts file instead of the default .js & .d.ts')
        .addOption(new Option('--standalone-file-path <standaloneFilePath>', 'Generate a single standalone .ts file at this path, which imports only cassandra-driver, instead of generating into this package')
            .argParser(parseTsFilePath)
            .conflicts(['generateTsFile', 'outputDir']))
        // To be used in conjunction with the Node.js Cassandra client is configured to use ECMAScript Map
        .option('--use-js-map', 'Map the Cassandra `map` type to the JavaScript `Map` type')
        // To be used in conjunction with the Node.js Cassandra client is configured to use ECMAScript Set
        .option('--use-js-set', 'Map the Cassandra `set` type to the JavaScript `Set` type')
        // Currently used only for tests
        .addOption(new Option('--output-dir <outputDir>', 'Directory of generated files').default(defaultOutputDir).hideHelp())

    program.parse();

    return program.opts();
}

const main = async () => {
    const args = parseArgs();

    const client = new Client({
        contactPoints: [`${args.host}${args.port ? ':' + args.port : ''}`],
        localDataCenter: args.datacenter,
        ...(args.username && args.password && {
            credentials: {
                username: args.username,
                password: args.password,
            },
        })
    });
    try {
        await client.connect();

        await generateTypeScriptDefinitions(
            client,
            args.keyspace,
            args.outputDir,
            args.typeSuffix,
            args.generateTsFile,
            args.useJsMap,
            args.useJsSet,
            args.standaloneFilePath
        );
    } catch (error: any) {
        console.error(`Encountered error: ${error?.message}`);
        await client.shutdown();
    }
}

main().then(() => process.exit());
