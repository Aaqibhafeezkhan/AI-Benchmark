import { describe, expect, it } from "vitest"
import { determineWinner, emptyScore } from "./scoring"

describe("winner determination", () => {
  it("returns the model with the higher total score", () => {
    expect(determineWinner(["a", "b"], {
      a: { accuracy: 8, tone: 7, speed: 9 },
      b: { accuracy: 7, tone: 7, speed: 8 },
    })).toBe("a")
  })

  it("returns a tie when totals are equal", () => {
    expect(determineWinner(["a", "b"], {
      a: { accuracy: 8, tone: 7, speed: 9 },
      b: { accuracy: 9, tone: 8, speed: 7 },
    })).toBe("tie")
  })

  it("returns null when either model remains unscored", () => {
    expect(determineWinner(["a", "b"], {
      a: { accuracy: 10, tone: 10, speed: 10 },
      b: emptyScore(),
    })).toBeNull()
    expect(determineWinner(["a", "b"], {})).toBeNull()
  })

  it("treats zero as a scored value rather than an unscored sentinel", () => {
    expect(determineWinner(["a", "b"], {
      a: { accuracy: 0, tone: 0, speed: 0 },
      b: { accuracy: 1, tone: 1, speed: 1 },
    })).toBe("b")
  })
})
