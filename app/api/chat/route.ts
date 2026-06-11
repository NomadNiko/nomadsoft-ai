import { bedrock } from "@ai-sdk/amazon-bedrock";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import {
  type JSONSchema7,
  streamText,
  convertToModelMessages,
  type UIMessage,
} from "ai";

export const maxDuration = 30;

// Claude Haiku 4.5 — US cross-region inference profile (verified ACTIVE in account, us-east-1).
const MODEL_ID = "us.anthropic.claude-haiku-4-5-20251001-v1:0";

export async function POST(req: Request) {
  const {
    messages,
    system,
    tools,
  }: {
    messages: UIMessage[];
    system?: string;
    tools?: Record<string, { description?: string; parameters: JSONSchema7 }>;
  } = await req.json();

  const result = streamText({
    model: bedrock(MODEL_ID),
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
