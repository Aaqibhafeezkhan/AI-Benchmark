import { describe, expect, it } from "vitest"
import { providerErrorMessage, providerNetworkErrorMessage } from "./provider-errors"

describe("provider error messages", () => {
  it("maps common HTTP errors to readable guidance", () => {
    expect(providerErrorMessage(401)).toContain("authentication failed")
    expect(providerErrorMessage(403)).toContain("denied")
    expect(providerErrorMessage(429)).toContain("Rate limit")
    expect(providerErrorMessage(503)).toContain("temporarily unavailable")
  })

  it("identifies models that are unavailable without exposing the response body", () => {
    const secretLikeText = "Model not found. token=hf_private_value"
    const message = providerErrorMessage(404, secretLikeText)
    expect(message).toContain("model is not currently available")
    expect(message).not.toContain("hf_private_value")
  })

  it("returns a safe network error", () => {
    expect(providerNetworkErrorMessage()).toContain("Could not reach")
  })
})
