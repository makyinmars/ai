# External Provider Integration

This document explains how to use external AI SDK providers (such as Vercel AI SDK) with TanStack AI.

## Overview

TanStack AI supports using external AI SDK providers through a simple wrapper utility. This allows you to:

- ✅ Use official external providers (Vercel AI SDK, etc.)
- ✅ Access all provider-specific features and options
- ✅ Maintain full type safety with automatic model inference
- ✅ Mix external providers with custom adapters
- ✅ Use the same AI class API for all providers

## Installation

First, install the external provider SDK you want to use:

```bash
# For Vercel AI SDK - OpenAI
pnpm add @ai-sdk/openai

# For Vercel AI SDK - Anthropic
pnpm add @ai-sdk/anthropic

# For Vercel AI SDK - Google
pnpm add @ai-sdk/google

# etc.
```

## Quick Start

```typescript
import { AI, wrapExternalProvider } from "@tanstack/ai";
import { openai } from "@ai-sdk/openai";

// 1. Wrap the external provider function
// Models are automatically inferred from openai('modelId') parameter type!
const openaiAdapter = wrapExternalProvider(openai);

// 2. Use with AI class
const ai = new AI({
  adapters: {
    openai: openaiAdapter,
  },
});

// 3. Make requests
const result = await ai.chat({
  adapter: 'openai',
  model: 'gpt-4o', // ✅ Type-safe autocomplete - models inferred from openai() function!
  messages: [
    { role: 'user', content: 'Hello!' }
  ],
});
```

## Automatic Model Inference

The wrapper automatically infers available models from the provider function's parameter type. **You don't need to configure anything!**

```typescript
import { openai } from "@ai-sdk/openai";

// The openai function signature: openai(modelId: 'gpt-4o' | 'gpt-4' | ...) => LanguageModel
// wrapExternalProvider extracts those model types automatically!
const adapter = wrapExternalProvider(openai);

// ✅ TypeScript now knows all valid models without manual configuration
```

TypeScript extracts the model types directly from the provider function's parameter, giving you:
- **Full type safety** - TypeScript knows which models are available
- **Zero configuration** - No manual model specification needed
- **Always accurate** - Model types stay in sync with the provider package

## How It Works

The external provider from Vercel AI SDK (and similar SDKs) exposes functions like:

```typescript
// From @ai-sdk/openai
export function openai(
  modelId: 'gpt-4o' | 'gpt-4' | 'gpt-3.5-turbo' | ...,
  options?: OpenAIOptions
): LanguageModel;
```

Our wrapper:
1. Takes this provider function
2. Extracts the model ID type from the first parameter using TypeScript utilities
3. Creates a BaseAdapter that calls the provider function internally
4. Converts between external SDK format and our format

## Wrapper API

### `wrapExternalProvider(provider)`

Wraps an external provider function to work with TanStack AI. Automatically infers available models from the function's parameter type.

**Parameters:**
- `provider` - External provider function (e.g., `openai` from `@ai-sdk/openai`)

**Returns:** `BaseAdapter` compatible with TanStack AI

**Type Inference:**
The wrapper extracts model types using: `Parameters<typeof provider>[0]`

## Examples

### Example 1: OpenAI (Vercel AI SDK)

```typescript
import { AI, wrapExternalProvider } from "@tanstack/ai";
import { openai } from "@ai-sdk/openai";

const openaiAdapter = wrapExternalProvider(openai);

const ai = new AI({
  adapters: { openai: openaiAdapter },
});

// Chat
const chatResponse = await ai.chat({
  adapter: 'openai',
  model: 'gpt-4o', // ✅ Autocomplete works!
  messages: [
    { role: 'user', content: 'Explain quantum computing' }
  ],
});

// Streaming
const stream = ai.chatStream({
  adapter: 'openai',
  model: 'gpt-4o',
  messages: [
    { role: 'user', content: 'Write a story' }
  ],
});

for await (const chunk of stream) {
  if (chunk.type === 'content') {
    console.log(chunk.delta);
  }
}
```

### Example 2: Anthropic (Vercel AI SDK)

```typescript
import { AI, wrapExternalProvider } from "@tanstack/ai";
import { anthropic } from "@ai-sdk/anthropic";

const anthropicAdapter = wrapExternalProvider(anthropic);

const ai = new AI({
  adapters: { anthropic: anthropicAdapter },
});

const response = await ai.chat({
  adapter: 'anthropic',
  model: 'claude-3-5-sonnet-20241022', // ✅ Autocomplete works!
  messages: [
    { role: 'user', content: 'Write a haiku about AI' }
  ],
});
```

### Example 3: Mixing Providers

You can use multiple external providers together:

```typescript
import { AI, wrapExternalProvider } from "@tanstack/ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { OpenAIAdapter } from "@tanstack/ai-openai";

const ai = new AI({
  adapters: {
    // External providers
    vercelOpenai: wrapExternalProvider(openai),
    vercelAnthropic: wrapExternalProvider(anthropic),
    
    // Native adapters
    openai: new OpenAIAdapter({ apiKey: '...' }),
  },
  fallbacks: [
    { adapter: 'vercelOpenai', model: 'gpt-4' },
    { adapter: 'vercelAnthropic', model: 'claude-3-5-sonnet-20241022' },
  ],
});

// Use Anthropic for chat
const response = await ai.chat({
  adapter: 'vercelAnthropic',
  model: 'claude-3-5-sonnet-20241022',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

### Example 4: Provider-Specific Options

Pass provider-specific options through `providerOptions`:

```typescript
const response = await ai.chat({
  adapter: 'openai',
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
  providerOptions: {
    // OpenAI-specific options
    user: 'user-123',
    store: true,
    metadata: {
      session: 'chat-session-1',
    },
  },
});
```
## Type Safety

The wrapper maintains full type safety:

```typescript
import { openai } from "@ai-sdk/openai";

// Wrap with automatic model inference
const adapter = wrapExternalProvider(openai);

const ai = new AI({
  adapters: { openai: adapter },
});

// ✅ TypeScript knows valid models from the openai() function signature
await ai.chat({
  adapter: 'openai',
  model: 'gpt-4o', // Autocomplete works!
  messages: [{ role: 'user', content: 'Hello' }],
});

// ❌ TypeScript error for invalid model
await ai.chat({
  adapter: 'openai',
  model: 'invalid-model', // Error: not in openai() parameter types
  messages: [{ role: 'user', content: 'Hello' }],
});
```

### Model Type Inference

The wrapper uses TypeScript's type system to extract model types from the provider function:

```typescript
// Provider function signature:
// openai(modelId: 'gpt-4o' | 'gpt-4' | 'gpt-3.5-turbo') => LanguageModel

// Wrapper extracts: 'gpt-4o' | 'gpt-4' | 'gpt-3.5-turbo'
type ExtractModelId<T> = T extends (modelId: infer M, ...args: any[]) => any ? M : never;
type Models = ExtractModelId<typeof openai>;
// Result: 'gpt-4o' | 'gpt-4' | 'gpt-3.5-turbo'
```

## Supported Features

### ✅ Fully Supported
- Chat completions
- Streaming responses
- Text generation
- Tool/function calling
- Provider-specific options via `providerOptions`

### ⚠️ Provider-Dependent
- Embeddings (use provider-specific adapter)
- Image generation (use provider-specific adapter)
- Vision/multimodal (depends on model support)

### ❌ Not Yet Supported via Wrapper
- Transcription (use provider-specific adapter)
- Speech synthesis (use provider-specific adapter)
- Fine-tuning (use provider SDK directly)
- Model training (use provider SDK directly)

## How It Works Internally

The wrapper:

1. **Type Inference**: Uses TypeScript's `Parameters<>` utility to extract model ID types from the provider function's first parameter
   ```typescript
   type ExtractModelId<T> = T extends (modelId: infer M, ...args: any[]) => any ? M : never;
   ```

2. **Provider Wrapping**: Wraps the provider function and creates a BaseAdapter
   ```typescript
   const model = provider(options.model); // Calls openai('gpt-4o')
   ```

3. **Format Conversion**: Converts between TanStack AI message format and external provider format
   ```typescript
   // Our format → External format
   { role: 'user', content: '...' } → { role: 'user', content: '...' }
   ```

4. **Response Mapping**: Maps external provider responses to TanStack AI response format
   ```typescript
   result.text → response.content
   result.finishReason → response.finishReason
   ```

5. **Streaming**: Handles streaming responses and converts chunks to TanStack format
   ```typescript
   for await (const chunk of streamResult.stream) {
     if (chunk.type === 'text-delta') {
       yield { type: 'content', delta: chunk.textDelta, ... };
     }
   }
   ```

## Limitations

1. **Runtime Model List**: At runtime, the wrapper doesn't have access to the actual list of models (only their types). The `models` array on the adapter will be empty, but TypeScript still knows the valid model types for type-checking.

2. **Provider Updates**: If a provider adds new models, you'll need to update the provider package to get the new types.

3. **Limited Feature Set**: The wrapper currently focuses on core language model features. For advanced features like embeddings and image generation, use provider-specific adapters from `@tanstack/ai-openai`, etc.

4. **API Key Configuration**: Unlike provider-specific adapters that take API keys in the constructor, external providers require their own configuration before wrapping:
   ```typescript
   // External providers handle their own config
   import { openai } from "@ai-sdk/openai";
   // Note: @ai-sdk/openai uses environment variables or global config
   const adapter = wrapExternalProvider(openai);
   ```

## Troubleshooting

### Models not autocompleting

Make sure you're importing from the correct package:

```typescript
import { openai } from "@ai-sdk/openai"; // ✅ Correct
import { OpenAI } from "openai"; // ❌ Wrong package
```

### Type errors with providerOptions

Provider options are passed directly to the external provider and spread into the request. They should match the provider's expected options:

```typescript
providerOptions: {
  user: 'user-123', // OpenAI-specific
  store: true, // OpenAI-specific
}
```

### "Provider does not support X" errors

Some features like embeddings and image generation are not yet supported by the wrapper. Use provider-specific adapters instead:

```typescript
// ✅ For embeddings and images, use provider-specific adapters
import { OpenAIAdapter } from "@tanstack/ai-openai";

const ai = new AI({
  adapters: {
    // For chat/text - use wrapper
    chat: wrapExternalProvider(openai),
    // For embeddings/images - use native adapter
    full: new OpenAIAdapter({ apiKey: '...' }),
  },
});
```

## Migration Guide

### From Old wrapVercelProvider API

The API has been simplified to a single-argument function:

```typescript
// ❌ OLD (two arguments, manual config)
import { createOpenAI } from "@ai-sdk/openai";

const provider = createOpenAI({ apiKey: '...' });
const adapter = wrapVercelProvider(provider, {
  name: 'openai',
  models: ['gpt-4o', 'gpt-4'] as const,
});

// ✅ NEW (single argument, auto-inference)
import { openai } from "@ai-sdk/openai";

const adapter = wrapExternalProvider(openai);
```

Key differences:
- Import `openai` (function) instead of `createOpenAI` (factory)
- No configuration object needed
- Models automatically inferred from function signature
- Provider name automatically determined

### From Provider-Specific Adapters

If you want to try external providers instead of our native adapters:

```typescript
// Old: Using native adapter
import { OpenAIAdapter } from "@tanstack/ai-openai";
const adapter = new OpenAIAdapter({
  apiKey: process.env.OPENAI_API_KEY,
});

// New: Using external provider wrapper
import { openai } from "@ai-sdk/openai";
const adapter = wrapExternalProvider(openai);
// Note: API key configured via @ai-sdk/openai's own methods
```

Benefits of wrapper:
- Always up-to-date with latest provider features
- Official provider SDK maintained by provider
- Access to experimental features

Benefits of native adapters:
- Consistent API across all providers
- Full feature support (embeddings, images, etc.)
- Unified configuration

## See Also

- [BaseAdapter API](./docs/base-adapter.md)
- [AI Class Documentation](./docs/ai-class.md)
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
