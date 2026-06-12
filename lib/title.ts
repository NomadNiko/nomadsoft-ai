import { bedrock } from "@ai-sdk/amazon-bedrock";
import { generateText } from "ai";

/** Bedrock model used purely for generating short conversation titles. */
const TITLE_MODEL_ID = "amazon.nova-micro-v1:0";

/** Hard cap on generated title length (characters). */
export const MAX_TITLE_LENGTH = 30;

/**
 * Generate a short, unique conversation title from the first user message
 * using Amazon Nova Micro.
 *
 * - Temperature is high so asking the same question repeatedly yields
 *   different titles (per product requirement).
 * - Output is sanitized and hard-capped to MAX_TITLE_LENGTH characters.
 * - Returns null on any failure so callers can fall back gracefully; this
 *   function never throws.
 */
export async function generateConversationTitle(question: string): Promise<string | null> {
  const trimmed = question.trim();
  if (!trimmed) return null;

  try {
    const { text } = await generateText({
      model: bedrock(TITLE_MODEL_ID),
      temperature: 1.0,
      maxOutputTokens: 30,
      prompt:
        `Generate a short, unique conversation title for a chat that begins ` +
        `with the user message below. Requirements:\n` +
        `- Maximum ${MAX_TITLE_LENGTH} characters.\n` +
        `- No surrounding quotes, no trailing punctuation.\n` +
        `- Capture the topic of the question.\n\n` +
        `User message:\n"""${trimmed.slice(0, 500)}"""\n\n` +
        `Return ONLY the title text.`,
    });

    return sanitizeTitle(text);
  } catch {
    return null;
  }
}

/** Normalize model output into a clean, length-capped title. */
export function sanitizeTitle(raw: string): string | null {
  let title = raw.trim();
  // Strip wrapping quotes the model sometimes adds.
  title = title.replace(/^["'`]+|["'`]+$/g, "").trim();
  // Collapse internal whitespace/newlines.
  title = title.replace(/\s+/g, " ").trim();
  // Remove trailing punctuation.
  title = title.replace(/[.!?,;:]+$/, "").trim();
  if (!title) return null;
  if (title.length > MAX_TITLE_LENGTH) {
    title = title.slice(0, MAX_TITLE_LENGTH).trim();
  }
  return title || null;
}
