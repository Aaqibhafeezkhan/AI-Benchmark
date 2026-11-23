import { createServer } from "node:http"
import { access, mkdir, readFile } from "node:fs/promises"
import path from "node:path"

const root = path.resolve(process.cwd())
const outputDirectory = path.join(root, "out")
const imageDirectory = path.join(root, "docs", "images")
const basePath = "/AI-Benchmark"
let browser

try {
  await access(path.join(outputDirectory, "index.html"))
} catch {
  process.stderr.write("Run npm run build before capturing screenshots.\n")
  process.exit(1)
}

let chromium
try {
  const playwright = await import("playwright")
  chromium = playwright.chromium
} catch {
  process.stderr.write("Playwright is not installed. Install it with npm install --no-save playwright, then run npx playwright install chromium.\n")
  process.exit(1)
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".json": "application/json",
  ".woff2": "font/woff2",
}

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1")
    if (!requestUrl.pathname.startsWith(basePath)) {
      response.writeHead(404)
      response.end()
      return
    }
    const suffix = requestUrl.pathname.slice(basePath.length) || "/"
    const relativePath = suffix.endsWith("/") ? suffix + "index.html" : suffix
    const target = path.resolve(outputDirectory, "." + relativePath)
    if (!target.startsWith(outputDirectory + path.sep)) {
      response.writeHead(403)
      response.end()
      return
    }
    const content = await readFile(target)
    response.writeHead(200, { "Content-Type": mimeTypes[path.extname(target)] ?? "application/octet-stream" })
    response.end(content)
  } catch {
    response.writeHead(404)
    response.end()
  }
})

await mkdir(imageDirectory, { recursive: true })
await new Promise((resolve) => server.listen(4173, "127.0.0.1", resolve))

try {
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 })
  await page.goto("http://127.0.0.1:4173/AI-Benchmark/", { waitUntil: "networkidle" })
  await page.getByLabel("Benchmark prompt text").waitFor()
  await page.getByRole("button", { name: "Compare", exact: true }).click()
  await page.waitForSelector('button:has-text("Stop")', { state: "detached", timeout: 60000 })
  await page.screenshot({ path: path.join(imageDirectory, "comparison.png"), fullPage: true })
  const leaderboard = page.locator("section").filter({ has: page.locator("#livebench-title") }).first()
  await leaderboard.screenshot({ path: path.join(imageDirectory, "leaderboard.png") })
  await page.getByRole("heading", { name: "Recent run history" }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: path.join(imageDirectory, "history.png"), fullPage: true })
  await page.setViewportSize({ width: 1280, height: 640 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: path.join(imageDirectory, "social-preview.png") })
} finally {
  if (browser) await browser.close()
  await new Promise((resolve) => server.close(resolve))
}

process.stdout.write("Captured comparison, leaderboard, history and social preview screenshots.\n")
