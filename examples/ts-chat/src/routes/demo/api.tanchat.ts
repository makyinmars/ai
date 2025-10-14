import { createFileRoute } from "@tanstack/react-router";
import { AI, tool } from "@tanstack/ai";
import { OllamaAdapter } from "@tanstack/ai-ollama";
import { OpenAIAdapter } from "@tanstack/ai-openai";
import { wrapExternalProvider } from "@tanstack/ai";
import { openai } from "@ai-sdk/openai"
import type { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import guitars from "@/data/example-guitars";

// this is how you would wrap any external provider to conform to our adapter interface
// this returns a base-adapter conforming object that you can use in the adapters map
// it should also be typesafe as our wrapper is
// By specifying OpenAIResponsesProviderOptions as the type parameter, we get full type safety for providerOptions
// Models are automatically inferred from the openai function parameter type
const adapter = wrapExternalProvider<OpenAIResponsesProviderOptions>()(openai);

const SYSTEM_PROMPT = `You are a helpful assistant for a store that sells guitars.

You can use the following tools to help the user:

- getGuitars: Get all guitars from the database
- recommendGuitar: Recommend a guitar to the user
`;

// Define tools with the exact Tool structure - no conversions under the hood!
const tools = {
  getGuitars: tool({
    type: "function",
    function: {
      name: "getGuitars",
      description: "Get all products from the database",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    execute: async () => {
      return JSON.stringify(guitars);
    },
  }),
  recommendGuitar: tool({
    type: "function",
    function: {
      name: "recommendGuitar",
      description: "Use this tool to recommend a guitar to the user",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "The id of the guitar to recommend",
          },
          name: {
            type: "boolean",
            description: "Whether to include the name in the response",
          },
        },
        required: ["id"],
      },
    },
    execute: async (args) => {
      // ✅ args is automatically typed as { id: string; name?: boolean }
      return JSON.stringify({ id: args.id });
    },
  }),
}

// Initialize AI with tools and system prompts in constructor
const ai = new AI({
  adapters: {
    ollama: new OllamaAdapter({
      apiKey: process.env.AI_KEY!,
    }),
    openAi: new OpenAIAdapter({
      apiKey: process.env.AI_KEY!,
    }),
    // this works the same way as the adapters above because wrapper converted it to our convention
    externalOpenAi: adapter
  },
  fallbacks: [
    {
      adapter: "openAi",
      model: "gpt-4",
    },
  ],
  tools,
  systemPrompts: [SYSTEM_PROMPT],
});

export const Route = createFileRoute("/demo/api/tanchat")({
  loader: async () => {
    return {
      message: "TanChat API Route with Provider Options",
    };
  },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = await request.json();

        // Example: Using OpenAI with provider-specific options
        // System prompts are automatically prepended from constructor
        return ai.chat({
          model: "gpt-4o",
          adapter: "openAi",
          fallbacks: [
            // I can add the external adapter as a fallback here with typesafe model config thanks to our wrapper
            {
              adapter: "externalOpenAi",
              // this should be typesafe
              model: "gpt-3.5-turbo",
              // this should be typesafe
              providerOptions: {
                "instructions": "You are a helpful assistant that provides concise answers."
              }
            },
            {
              adapter: "ollama",
              model: "gpt-oss:20b",
              providerOptions: {

              }
            },
            {
              adapter: "openAi",
              model: "gpt-4",
              providerOptions: {
                "instructions": "You are a helpful assistant that provides concise answers."
              }
            }
          ],
          as: "response",
          messages,
          temperature: 0.7,
          tools: ["getGuitars", "recommendGuitar"],
          toolChoice: "auto",
          maxIterations: 5,
          // ✅ Provider-specific options typed based on the selected adapter
          // Note: TypeScript provides autocomplete based on the adapter type
          providerOptions: {
            // Control response verbosity
            textVerbosity: "high", // 'low' | 'medium' | 'high'

            // Store generation for distillation
            store: true,
            metadata: {
              session: "guitar-chat",
              timestamp: new Date().toISOString(),
            },

            // User identifier for monitoring
            user: "guitar-store-user",

            // Parallel tool calling
            parallelToolCalls: false, // Execute tools one at a time for this example
          },
        });
      },
    },
  },
});
