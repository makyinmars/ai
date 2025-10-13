import { createFileRoute } from "@tanstack/react-router";
import { AI, Tool, ToolConfig } from "@tanstack/ai";
import { OllamaAdapter } from "@tanstack/ai-ollama";
import { OpenAIAdapter } from "@tanstack/ai-openai";

import guitars from "@/data/example-guitars";

const SYSTEM_PROMPT = `You are a helpful assistant for a store that sells guitars.

You can use the following tools to help the user:

- getGuitars: Get all guitars from the database
- recommendGuitar: Recommend a guitar to the user
`;

// Define tools registry
const tools = {
  getGuitars: {
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
  },
  recommendGuitar: {
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
        },
        required: ["id"],
      },
    },
    execute: async ({ id }: { id: string }) => {
      return JSON.stringify({ id });
    },
  },
} as const satisfies ToolConfig;

// Initialize AI with tools in constructor
const ai = new AI({
  adapters: {
    ollama: new OllamaAdapter({
      apiKey: process.env.AI_KEY!,
    }),
    openAi: new OpenAIAdapter({
      apiKey: process.env.AI_KEY!,
    }),
  },
  fallbacks: [
    {
      adapter: "openAi",
      model: "gpt-4",
    },
  ],
  tools, // ← Register tools once here!
});

export const Route = createFileRoute("/demo/api/tanchat")({
  server: {
    handlers: {
      POST: async ({ request }): Promise<Response> => {
        try {
          const { messages } = await request.json();

          // Add system message if not present
          const allMessages =
            messages[0]?.role === "system"
              ? messages
              : [{ role: "system", content: SYSTEM_PROMPT }, ...messages];

          // Use tools by name - type-safe!
          return ai.chat({
            model: "gpt-4o",
            adapter: "openAi",
            fallbacks: [
              {
                adapter: "ollama",
                model: "gpt-oss:20b",
              },
            ],
            as: "response",
            messages: allMessages,
            temperature: 0.7,
            tools: ["getGuitars", "recommendGuitar"], // ← Type-safe tool names!
            toolChoice: "auto",
            maxIterations: 5,
          });
        } catch (error) {
          console.error("Chat API error:", error);
          return new Response(
            JSON.stringify({ error: "Failed to process chat request" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      },
    },
  },
});
