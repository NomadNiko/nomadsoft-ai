import { bedrock } from "@ai-sdk/amazon-bedrock";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { type JSONSchema7, streamText, convertToModelMessages, type UIMessage } from "ai";
import { resolveModelId } from "@/lib/models";

export const maxDuration = 30;

export async function POST(req: Request) {
  const {
    messages,
    system,
    tools,
    model,
  }: {
    messages: UIMessage[];
    system?: string;
    tools?: Record<string, { description?: string; parameters: JSONSchema7 }>;
    /** Model key from the registry; validated server-side. */
    model?: string;
  } = await req.json();

  // resolveModelId rejects unknown/missing keys and falls back to the default,
  // so an arbitrary string can never reach Bedrock.
  const modelId = resolveModelId(model);

  const result = streamText({
    model: bedrock(modelId),
    messages: await convertToModelMessages(messages),
    system,
    tools: {
      ...frontendTools(tools ?? {}),
    },
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
  });
}
