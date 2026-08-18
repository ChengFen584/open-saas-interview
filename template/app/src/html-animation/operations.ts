import OpenAI from "openai";
import type { HtmlAnimation } from "wasp/entities";
import { env, HttpError } from "wasp/server";
import type {
  GenerateHtmlAnimation,
  GetHtmlAnimation,
  ListHtmlAnimations,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import {
  AnimationValidationError,
  generateValidatedAnimation,
} from "./generation";
import { OpenAiAnimationModel } from "./openAiAnimationModel";

const generateInputSchema = z.object({
  prompt: z.string().trim().min(8).max(500),
});

const getInputSchema = z.object({
  id: z.string().uuid(),
});

type GenerateInput = z.infer<typeof generateInputSchema>;
type GetInput = z.infer<typeof getInputSchema>;

export type HtmlAnimationSummary = Pick<
  HtmlAnimation,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "prompt"
  | "title"
  | "status"
  | "error"
  | "repaired"
>;

export const generateHtmlAnimation: GenerateHtmlAnimation<
  GenerateInput,
  HtmlAnimation
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Authentication is required.");
  }

  const { prompt } = ensureArgsSchemaOrThrowHttpError(
    generateInputSchema,
    rawArgs,
  );

  const pendingAnimation = await context.entities.HtmlAnimation.create({
    data: {
      prompt,
      user: { connect: { id: context.user.id } },
    },
  });

  try {
    const aiModel = new OpenAiAnimationModel(
      new OpenAI({ apiKey: env.OPENAI_API_KEY }),
      env.OPENAI_ANIMATION_MODEL,
    );
    const result = await generateValidatedAnimation(prompt, aiModel);

    return await context.entities.HtmlAnimation.update({
      where: { id: pendingAnimation.id },
      data: {
        title: result.draft.title,
        html: result.draft.html,
        repaired: result.repaired,
        status: "COMPLETED",
        error: null,
      },
    });
  } catch (error) {
    const failureReason = getSafeFailureReason(error);

    await context.entities.HtmlAnimation.update({
      where: { id: pendingAnimation.id },
      data: {
        status: "FAILED",
        error: failureReason,
      },
    });

    throw new HttpError(
      502,
      "Animation generation failed. Please try a different prompt.",
      { animationId: pendingAnimation.id },
    );
  }
};

export const listHtmlAnimations: ListHtmlAnimations<
  void,
  HtmlAnimationSummary[]
> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, "Authentication is required.");
  }

  return context.entities.HtmlAnimation.findMany({
    where: { userId: context.user.id },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      prompt: true,
      title: true,
      status: true,
      error: true,
      repaired: true,
    },
  });
};

export const getHtmlAnimation: GetHtmlAnimation<
  GetInput,
  HtmlAnimation
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Authentication is required.");
  }

  const { id } = ensureArgsSchemaOrThrowHttpError(getInputSchema, rawArgs);
  const animation = await context.entities.HtmlAnimation.findFirst({
    where: {
      id,
      userId: context.user.id,
    },
  });

  if (!animation) {
    throw new HttpError(404, "Animation not found.");
  }

  return animation;
};

function getSafeFailureReason(error: unknown): string {
  if (error instanceof AnimationValidationError) {
    return error.issues.join(" ").slice(0, 500);
  }

  return "The AI provider request failed.";
}
