import {readFileSync} from "fs";
import {join} from "path";
import {Project} from "ts-morph";

test("The standalone file imports only cassandra-driver", () => {
    const sourceFile = new Project().createSourceFile("generated.ts", readFileSync(join(__dirname, "generated.ts"), "utf8"));

    const moduleSpecifiers = sourceFile.getImportDeclarations().map(declaration => declaration.getModuleSpecifierValue());

    expect(moduleSpecifiers).toEqual(["cassandra-driver"]);
});
