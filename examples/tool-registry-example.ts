/**
 * Tool Registry Example
 * 
 * Demonstrates the new tool registry API where tools are defined once
 * in the constructor and then referenced by name in chat calls.
 */

import { AI } from "@ts-poc/ai";
import { OpenAIAdapter } from "@ts-poc/ai-openai";
import { OllamaAdapter } from "@ts-poc/ai-ollama";

// Define all tools in a type-safe registry
const tools = {
  get_weather: {
    type: "function" as const,
    function: {
      name: "get_weather",
      description: "Get current weather for a location",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "City name, e.g. 'San Francisco'"
          },
          unit: {
            type: "string",
            enum: ["celsius", "fahrenheit"],
            description: "Temperature unit"
          }
        },
        required: ["location"],
      },
    },
    execute: async (args: { location: string; unit?: string }) => {
      console.log(`  → Fetching weather for ${args.location} in ${args.unit || "fahrenheit"}`);
      // Simulate API call
      return JSON.stringify({
        location: args.location,
        temperature: args.unit === "celsius" ? 22 : 72,
        condition: "sunny",
        humidity: 65,
      });
    },
  },

  calculate: {
    type: "function" as const,
    function: {
      name: "calculate",
      description: "Perform mathematical calculations",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "Math expression to evaluate, e.g. '2 + 2'"
          },
        },
        required: ["expression"],
      },
    },
    execute: async (args: { expression: string }) => {
      console.log(`  → Calculating: ${args.expression}`);
      try {
        // In production, use a safe math parser!
        const result = eval(args.expression);
        return JSON.stringify({ result, expression: args.expression });
      } catch (error: any) {
        return JSON.stringify({ error: error.message });
      }
    },
  },

  search_database: {
    type: "function" as const,
    function: {
      name: "search_database",
      description: "Search the product database",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query"
          },
          limit: {
            type: "number",
            description: "Maximum number of results",
            default: 5
          }
        },
        required: ["query"],
      },
    },
    execute: async (args: { query: string; limit?: number }) => {
      console.log(`  → Searching database for: "${args.query}" (limit: ${args.limit || 5})`);
      // Simulate database search
      return JSON.stringify({
        query: args.query,
        results: [
          { id: 1, name: "Product A", relevance: 0.95 },
          { id: 2, name: "Product B", relevance: 0.87 },
        ],
      });
    },
  },

  send_email: {
    type: "function" as const,
    function: {
      name: "send_email",
      description: "Send an email notification",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Email recipient" },
          subject: { type: "string", description: "Email subject" },
          body: { type: "string", description: "Email body" },
        },
        required: ["to", "subject", "body"],
      },
    },
    execute: async (args: { to: string; subject: string; body: string }) => {
      console.log(`  → Sending email to ${args.to}: "${args.subject}"`);
      // Simulate email sending
      return JSON.stringify({
        success: true,
        messageId: `msg-${Date.now()}`,
      });
    },
  },
} as const;

// Initialize AI with tool registry
const ai = new AI({
  adapters: {
    openai: new OpenAIAdapter({
      apiKey: process.env.OPENAI_API_KEY || "",
    }),
    ollama: new OllamaAdapter({
      baseURL: "http://localhost:11434",
    }),
  },
  tools, // ← Register all tools here!
});

// ============================================================================
// Example 1: Use specific tools by name (type-safe!)
// ============================================================================
async function weatherExample() {
  console.log("\n=== Weather Example ===\n");

  const result = await ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: [
      { role: "user", content: "What's the weather in San Francisco and New York?" },
    ],
    tools: ["get_weather"], // ← Type-safe! Only registered tool names allowed
    toolChoice: "auto",
    maxIterations: 5,
  });

  console.log("\nFinal response:", result.content);
}

// ============================================================================
// Example 2: Use multiple tools
// ============================================================================
async function calculatorExample() {
  console.log("\n=== Calculator Example ===\n");

  const result = await ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: [
      { role: "user", content: "What's 123 * 456? Also tell me the weather in Tokyo." },
    ],
    tools: ["calculate", "get_weather"], // ← Multiple tools, type-safe!
    toolChoice: "auto",
    maxIterations: 5,
  });

  console.log("\nFinal response:", result.content);
}

// ============================================================================
// Example 3: Streaming with tools
// ============================================================================
async function streamingWithTools() {
  console.log("\n=== Streaming with Tools ===\n");

  const stream = ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: [
      { role: "user", content: "Search for 'guitar' and calculate 299 + 399" },
    ],
    tools: ["search_database", "calculate"], // ← Type-safe tool names
    toolChoice: "auto",
    maxIterations: 5,
    as: "stream" as const,
  });

  for await (const chunk of stream) {
    if (chunk.type === "content") {
      process.stdout.write(chunk.delta);
    } else if (chunk.type === "tool_call") {
      console.log(`\n→ Calling tool: ${chunk.toolCall.function.name}`);
    } else if (chunk.type === "done") {
      console.log("\n\n✓ Done");
    }
  }
}

// ============================================================================
// Example 4: All tools available
// ============================================================================
async function allToolsExample() {
  console.log("\n=== All Tools Example ===\n");

  const result = await ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: [
      {
        role: "user",
        content: "What's the weather in Paris? Calculate 50*20. Search for 'laptop'. Send an email to test@example.com with subject 'Hello'."
      },
    ],
    tools: ["get_weather", "calculate", "search_database", "send_email"], // ← All tools!
    toolChoice: "auto",
    maxIterations: 10, // More iterations for multiple tool calls
  });

  console.log("\nFinal response:", result.content);
}

// ============================================================================
// Example 5: No tools (regular chat)
// ============================================================================
async function noToolsExample() {
  console.log("\n=== No Tools Example ===\n");

  const result = await ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: [
      { role: "user", content: "Tell me a short joke about TypeScript" },
    ],
    // No tools specified - regular chat
  });

  console.log("Response:", result.content);
}

// ============================================================================
// Example 6: Get available tools programmatically
// ============================================================================
function listAvailableTools() {
  console.log("\n=== Available Tools ===\n");

  const toolNames = ai.toolNames;
  console.log("Registered tools:", toolNames);

  toolNames.forEach(name => {
    const tool = ai.getTool(name);
    console.log(`\n${name}:`);
    console.log(`  Description: ${tool.function.description}`);
    console.log(`  Has execute: ${!!tool.execute}`);
  });
}

// ============================================================================
// Example 7: Type safety demonstration
// ============================================================================
async function typeSafetyDemo() {
  console.log("\n=== Type Safety Demo ===\n");

  // ✅ This works - valid tool names
  const result1 = await ai.chat({
    adapter: "openai",
    model: "gpt-4",
    messages: [{ role: "user", content: "Test" }],
    tools: ["get_weather", "calculate"], // TypeScript validates these!
  });

  // ❌ This would be a TypeScript error - invalid tool name
  // const result2 = await ai.chat({
  //   adapter: "openai",
  //   model: "gpt-4",
  //   messages: [{ role: "user", content: "Test" }],
  //   tools: ["invalid_tool"], // TypeScript error!
  // });

  console.log("Type safety works! ✓");
}

// ============================================================================
// Run examples
// ============================================================================
async function main() {
  console.log("=".repeat(60));
  console.log("         TOOL REGISTRY EXAMPLES");
  console.log("=".repeat(60));

  try {
    listAvailableTools();
    await noToolsExample();
    await weatherExample();
    await calculatorExample();
    await streamingWithTools();
    await allToolsExample();
    await typeSafetyDemo();
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("         ALL EXAMPLES COMPLETED");
  console.log("=".repeat(60) + "\n");
}

main();
