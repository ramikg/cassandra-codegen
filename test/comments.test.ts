import {readFileSync} from "fs";
import {join} from "path";
import {Project} from "ts-morph";

const sourceFile = new Project().createSourceFile("generated.d.ts", readFileSync(join(__dirname, "..", "src", "types", "generated.d.ts"), "utf8"));

const getMapperDocs = (mapperName: string) => sourceFile.getVariableDeclarationOrThrow(mapperName).getVariableStatementOrThrow().getJsDocs().map(doc => doc.getText());

test("Table with default options", () => {
    expect(getMapperDocs("testMapper")).toEqual([[
        "/**",
        " - compaction: `{'class': 'org.apache.cassandra.db.compaction.SizeTieredCompactionStrategy', 'max_threshold': '32', 'min_threshold': '4'}`",
        " - default_time_to_live: 0 (default)",
        " - gc_grace_seconds: 864000 (default)",
        " */",
    ].join("\n")]);
});

test("Table with non-default options", () => {
    expect(getMapperDocs("tableOptionsMapper")).toEqual([[
        "/**",
        " - compaction: `{'class': 'org.apache.cassandra.db.compaction.LeveledCompactionStrategy', 'max_threshold': '32', 'min_threshold': '4'}`",
        " - default_time_to_live: 3600",
        " - gc_grace_seconds: 3600",
        " - comment: Non-default options *\\/ with a comment terminator",
        " */",
    ].join("\n")]);
});

test("Row types have no docs", () => {
    expect(sourceFile.getInterfaceOrThrow("TestRow").getJsDocs()).toEqual([]);
});
