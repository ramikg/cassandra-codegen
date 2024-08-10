const CASSANDRA_ANY_TYPE = 'any';

function cassandraInnerTypeToTsType(cassandraType: string): string {
    switch (cassandraType) {
        case 'ascii':
        case 'text':
        case 'varchar':
            return 'string';
        case 'blob':
            return 'Buffer';
        case 'bigint':
        case 'counter':
        case 'double':
        case 'float':
        case 'int':
        case 'smallint':
        case 'tinyint':
        case 'varint':
            return 'number';
        case 'boolean':
            return 'boolean';
        case 'timestamp':
            return 'Date';
        case 'vector':
            return 'Float32Array';
        case 'date':
            return 'types.LocalDate';
        case 'time':
            return 'types.LocalTime';
        case 'timeuuid':
            return 'types.TimeUuid';
        case 'duration':
            return 'types.Duration';
        case 'inet':
            return 'InetAddress';
        case 'uuid':
            return 'types.Uuid';
        case 'decimal':
            return 'types.BigDecimal';
        default:
            console.warn(`Unsupported Cassandra type ${cassandraType}. Setting TypeScript type to "${CASSANDRA_ANY_TYPE}".`);
            return CASSANDRA_ANY_TYPE;
    }
}

export function cassandraTypeToTsType(cassandraType: string, useJsMap: boolean, useJsSet: boolean): string {
    // More complex nestings are currently not supported.
    const frozenCollectionRegex = /(?<isFrozen>frozen)?<?(?<frozenType>set|map|list)<(?<innerType>\w+)(?:,(?<secondInnerType>\w+))?>>?/;

    const frozenCollectionRegexMatch = cassandraType.match(frozenCollectionRegex);
    if (frozenCollectionRegexMatch?.groups) {
        const innerType = cassandraInnerTypeToTsType(frozenCollectionRegexMatch.groups.innerType);
        if (innerType === CASSANDRA_ANY_TYPE) {
            return CASSANDRA_ANY_TYPE;
        }

        let resultType = '';
        switch (frozenCollectionRegexMatch.groups.frozenType)
        {
            case 'set':
                if (useJsSet) {
                    resultType = `Set<${innerType}>`;
                } else {
                    resultType = `Array<${innerType}>`;
                }
                break;
            case 'list':
                resultType = `Array<${innerType}`;
                break;
            case 'map':
                if (useJsMap) {
                    const cassandraSecondInnerType = frozenCollectionRegexMatch.groups.secondInnerType;
                    if (!cassandraSecondInnerType) {
                        throw new Error(`Invalid Cassandra type ${cassandraType}`);
                    }
                    const secondInnerType = cassandraInnerTypeToTsType(cassandraSecondInnerType);
                    if (secondInnerType === CASSANDRA_ANY_TYPE) {
                        return CASSANDRA_ANY_TYPE;
                    }
                    resultType = `Map<${innerType}, ${secondInnerType}>`;
                } else {
                    return 'any';
                }

                break;
        }
        const isFrozen = frozenCollectionRegexMatch.groups.isFrozen != undefined;
        if (isFrozen) {
            resultType = 'Readonly' + resultType;
        }

        return resultType;
    }

    return cassandraInnerTypeToTsType(cassandraType);
}