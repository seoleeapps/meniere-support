import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
let errors = 0;
function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(file);
    else if (file.endsWith(".ts")) {
      const source = ts.createSourceFile(
        file,
        fs.readFileSync(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
      );
      function check(node) {
        if (
          (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
          node.moduleSpecifier
        ) {
          const name = node.moduleSpecifier.text;
          if (
            !name.startsWith(".") ||
            !path
              .resolve(path.dirname(file), name)
              .startsWith(path.resolve("packages/product-core/src") + path.sep)
          ) {
            console.error("Forbidden core dependency:", file, name);
            errors++;
          }
        }
        if (
          ts.isCallExpression(node) &&
          node.expression.getText(source) === "fetch"
        ) {
          console.error("Network call in core:", file);
          errors++;
        }
        ts.forEachChild(node, check);
      }
      check(source);
    }
  }
}
visit("packages/product-core/src");
if (errors) process.exit(1);
console.log("Core platform boundary: pass");
