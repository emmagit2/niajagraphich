import { config } from '../config.js';
import { GeminiProvider } from './gemini.js';
import { OpenAIProvider } from './openai.js';
import { AppError } from '../lib/errors.js';

export function getImageProvider() {
  if (config.aiProvider === 'gemini') {
    if (!config.geminiApiKey) throw new AppError(503,'AI_NOT_CONFIGURED','Gemini API is not configured.');
    return new GeminiProvider();
  }
  if (config.aiProvider === 'openai') {
    if (!config.openaiApiKey) throw new AppError(503,'AI_NOT_CONFIGURED','OpenAI image generation is not configured.');
    return new OpenAIProvider();
  }
  throw new AppError(503,'AI_PROVIDER_UNSUPPORTED','Configured AI provider is not supported. Add an adapter in src/providers.');
}
