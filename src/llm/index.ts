import { config } from '../config.js';
import { OpenAICompatibleProvider } from './openai-compatible.js';
import type { LLMProvider } from './provider.js';

let instance: LLMProvider | undefined;

export function getProvider(): LLMProvider {
  if (instance) return instance;
  instance = new OpenAICompatibleProvider({
    baseUrl: config.llmBaseUrl,
    model: config.llmModel,
    apiKey: config.llmApiKey,
    temperature: config.llmTemperature,
  });
  return instance;
}
