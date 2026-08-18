import { describe, expect, it } from "vitest";
import {
  AnimationValidationError,
  generateValidatedAnimation,
  type AnimationDraft,
  type AnimationModel,
} from "./generation";

const safeDraft: AnimationDraft = {
  title: "Orbiting planet",
  html: `<!doctype html><html><head><style>.planet { animation: orbit 3s infinite; } @keyframes orbit { to { transform: rotate(360deg); } }</style></head><body><div class="planet">Planet</div></body></html>`,
};

const unsafeDraft: AnimationDraft = {
  title: "Unsafe animation",
  html: `<!doctype html><html><head></head><body><script>alert(1)</script></body></html>`,
};

class FakeModel implements AnimationModel {
  createCalls = 0;
  repairCalls = 0;

  constructor(
    private readonly firstDraft: AnimationDraft,
    private readonly repairedDraft: AnimationDraft,
  ) {}

  async create(): Promise<AnimationDraft> {
    this.createCalls += 1;
    return this.firstDraft;
  }

  async repair(): Promise<AnimationDraft> {
    this.repairCalls += 1;
    return this.repairedDraft;
  }
}

describe("generateValidatedAnimation", () => {
  it("returns a secured first draft without calling repair", async () => {
    const model = new FakeModel(safeDraft, safeDraft);

    const result = await generateValidatedAnimation(
      "an orbiting planet",
      model,
    );

    expect(result.repaired).toBe(false);
    expect(result.draft.html).toContain("Content-Security-Policy");
    expect(model.createCalls).toBe(1);
    expect(model.repairCalls).toBe(0);
  });

  it("repairs one invalid draft and validates the replacement", async () => {
    const model = new FakeModel(unsafeDraft, safeDraft);

    const result = await generateValidatedAnimation(
      "an orbiting planet",
      model,
    );

    expect(result.repaired).toBe(true);
    expect(result.draft.title).toBe(safeDraft.title);
    expect(model.repairCalls).toBe(1);
  });

  it("fails closed when the repair is still invalid", async () => {
    const model = new FakeModel(unsafeDraft, unsafeDraft);

    await expect(
      generateValidatedAnimation("an orbiting planet", model),
    ).rejects.toBeInstanceOf(AnimationValidationError);
    expect(model.repairCalls).toBe(1);
  });
});
