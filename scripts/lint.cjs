const fs = require("node:fs")
const path = require("node:path")
const ts = require("typescript")

const root = path.resolve(__dirname, "..")
const failures = []
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"])
const sourceRoots = ["app", "components", "lib", "scripts"]
const configFiles = ["next.config.mjs", "tailwind.config.ts", "postcss.config.mjs"]

function walk(directory) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && [".git", ".next", "node_modules", "out", "coverage"].includes(entry.name)) return []
    const fullPath = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(fullPath) : [fullPath]
  })
}

function fail(file, message) {
  failures.push(path.relative(root, file) + ": " + message)
}

const allFiles = walk(root)
const markdownFiles = allFiles.filter((file) => file.endsWith(".md"))
const sourceFiles = [
  ...sourceRoots.flatMap((directory) => walk(path.join(root, directory))),
  ...configFiles.map((file) => path.join(root, file)),
  ...walk(path.join(root, ".github")),
].filter((file) => {
  if (path.resolve(file) === __filename) return false
  const extension = path.extname(file)
  return sourceExtensions.has(extension) || extension === ".css" || extension === ".yml" || extension === ".yaml"
})

for (const file of sourceFiles) {
  const text = fs.readFileSync(file, "utf8")
  const extension = path.extname(file)
  if (sourceExtensions.has(extension)) {
    const kind = extension === ".tsx" || extension === ".jsx" ? ts.ScriptKind.TSX : extension === ".js" || extension === ".cjs" || extension === ".mjs" ? ts.ScriptKind.JS : ts.ScriptKind.TS
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind)
    for (const diagnostic of source.parseDiagnostics) {
      const position = diagnostic.start === undefined ? "" : " at line " + (source.getLineAndCharacterOfPosition(diagnostic.start).line + 1)
      fail(file, "syntax error" + position)
    }
    const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, kind === ts.ScriptKind.TSX ? ts.LanguageVariant.JSX : ts.LanguageVariant.Standard, text)
    let token = scanner.scan()
    while (token !== ts.SyntaxKind.EndOfFileToken) {
      if (token === ts.SyntaxKind.SingleLineCommentTrivia || token === ts.SyntaxKind.MultiLineCommentTrivia) fail(file, "code comments are not allowed")
      if (token === ts.SyntaxKind.AnyKeyword) fail(file, "the any type is not allowed")
      token = scanner.scan()
    }
    if (/@ts-(?:ignore|expect-error)|eslint-disable/.test(text)) fail(file, "compiler and lint suppressions are not allowed")
  }
  if (extension === ".css" && /\/\*[\s\S]*?\*\//.test(text)) fail(file, "CSS comments are not allowed")
  if ((extension === ".yml" || extension === ".yaml") && /^\s*#/m.test(text)) fail(file, "YAML comments are not allowed")
}

const emojiPattern = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u
for (const file of markdownFiles) {
  const text = fs.readFileSync(file, "utf8")
  if (emojiPattern.test(text)) fail(file, "emoji or icon characters are not allowed in Markdown")
  const links = text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)
  for (const match of links) {
    const target = match[1].trim().split(/\s+/)[0]
    if (/^(?:https?:|mailto:|#)/i.test(target)) continue
    const relative = decodeURIComponent(target.split(/[?#]/)[0])
    if (!relative) continue
    const resolved = path.resolve(path.dirname(file), relative)
    if (!fs.existsSync(resolved)) fail(file, "broken relative link: " + target)
  }
}

if (failures.length > 0) {
  process.stderr.write(failures.join("\n") + "\n")
  process.exitCode = 1
} else {
  process.stdout.write("Source policy, comment, Markdown icon and relative-link checks passed.\n")
}
