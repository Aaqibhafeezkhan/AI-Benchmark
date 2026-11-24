import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { LOCAL_MODELS, DEFAULT_LOCAL_PAIR, isSupportedLocalModel } from "./local-models"

describe("local WebLLM model catalogue", () => {
  it("provides unique prebuilt model identifiers", () => {
    const ids = LOCAL_MODELS.map((model) => model.id)
    assert.equal(new Set(ids).size, ids.length)
    assert.ok(ids.every((id) => id.endsWith("-MLC")))
  })

  it("defaults to two distinct supported models", () => {
    assert.notEqual(DEFAULT_LOCAL_PAIR[0], DEFAULT_LOCAL_PAIR[1])
    assert.ok(DEFAULT_LOCAL_PAIR.every(isSupportedLocalModel))
  })

  it("does not include hosted or historical model identifiers", () => {
    assert.ok(LOCAL_MODELS.every((model) => !model.id.startsWith("hf-") && !model.id.startsWith("gh-")))
  })

  it("includes approximate sizes for first-run download disclosure", () => {
    assert.ok(LOCAL_MODELS.every((model) => /MB|GB/.test(model.size)))
  })

  it("contains only prebuilt variants documented by WebLLM", () => {
    assert.deepEqual(LOCAL_MODELS.map((model) => model.id), [
      "Llama-3.2-1B-Instruct-q4f16_1-MLC",
      "SmolLM2-360M-Instruct-q4f16_1-MLC",
      "SmolLM2-1.7B-Instruct-q4f16_1-MLC",
      "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    ])
  })
})
