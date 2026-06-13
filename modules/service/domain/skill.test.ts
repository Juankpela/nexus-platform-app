import { describe, expect, it } from "vitest"

import {
  SKILL_LEVELS,
  meetsSkillLevel,
  skillLevelRank,
  type SkillLevel,
} from "@/modules/service/domain/skill"

describe("skillLevelRank", () => {
  it("is strictly increasing across the level order", () => {
    const ranks = SKILL_LEVELS.map(skillLevelRank)
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]).toBeGreaterThan(ranks[i - 1])
    }
  })
})

describe("meetsSkillLevel", () => {
  it("passes when the held level equals or exceeds the requirement", () => {
    expect(meetsSkillLevel("senior", "mid")).toBe(true)
    expect(meetsSkillLevel("mid", "mid")).toBe(true)
    expect(meetsSkillLevel("expert", "junior")).toBe(true)
  })

  it("fails when the held level is below the requirement", () => {
    expect(meetsSkillLevel("junior", "senior")).toBe(false)
    expect(meetsSkillLevel("mid", "expert")).toBe(false)
  })

  it("is reflexive for every level", () => {
    for (const level of SKILL_LEVELS as SkillLevel[]) {
      expect(meetsSkillLevel(level, level)).toBe(true)
    }
  })
})
