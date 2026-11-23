const fs = require("node:fs")
const path = require("node:path")
const ts = require("typescript")

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8")
  const compiled = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  })
  module._compile(compiled.outputText, filename)
}

require(path.resolve(__dirname, "../lib/core.test.ts"))
