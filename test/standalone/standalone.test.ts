import {readFileSync} from "fs";
import {join} from "path";
import {Project} from "ts-morph";

// The point of --output-file: the generated file can live in the consumer's source tree with this package
// installed only to generate it, so it must import nothing but cassandra-driver.
test("The standalone file imports only cassandra-driver", () => {
    const sourceFile = new Project().createSourceFile("generated.ts", readFileSync(join(__dirname, "generated.ts"), "utf8"));

    const moduleSpecifiers = sourceFile.getImportDeclarations().map(declaration => declaration.getModuleSpecifierValue());

    expect(moduleSpecifiers).toEqual(["cassandra-driver"]);
});
