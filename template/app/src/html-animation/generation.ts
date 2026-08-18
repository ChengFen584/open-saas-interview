import { hardenAnimationHtml, validateAnimationHtml } from "./validation";

export type AnimationDraft = {
  title: string;
  html: string;
};

export type AnimationGenerationResult = {
  draft: AnimationDraft;
  repaired: boolean;
};

export interface AnimationModel {
  create(prompt: string): Promise<AnimationDraft>;
  repair(
    prompt: string,
    invalidDraft: AnimationDraft,
    issues: string[],
  ): Promise<AnimationDraft>;
}

export class AnimationValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Generated animation failed validation: ${issues.join(" ")}`);
    this.name = "AnimationValidationError";
  }
}

export async function generateValidatedAnimation(
  prompt: string,
  model: AnimationModel,
): Promise<AnimationGenerationResult> {
  const firstDraft = await model.create(prompt);
  const firstIssues = validateDraft(firstDraft);

  if (firstIssues.length === 0) {
    return {
      draft: secureDraft(firstDraft),
      repaired: false,
    };
  }

  const repairedDraft = await model.repair(prompt, firstDraft, firstIssues);
  const repairedIssues = validateDraft(repairedDraft);

  if (repairedIssues.length > 0) {
    throw new AnimationValidationError(repairedIssues);
  }

  return {
    draft: secureDraft(repairedDraft),
    repaired: true,
  };
}

function validateDraft(draft: AnimationDraft): string[] {
  const issues: string[] = [];
  const title = draft.title.trim();

  if (title.length === 0 || title.length > 80) {
    issues.push("Title must contain between 1 and 80 characters.");
  }

  const htmlValidation = validateAnimationHtml(draft.html);
  if (!htmlValidation.ok) {
    issues.push(...htmlValidation.issues);
  }

  return issues;
}

function secureDraft(draft: AnimationDraft): AnimationDraft {
  return {
    title: draft.title.trim(),
    html: hardenAnimationHtml(draft.html),
  };
}
