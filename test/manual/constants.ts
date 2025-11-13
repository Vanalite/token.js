import { models } from '../../src/models'

/**
 * Models to use in manual tests. We include one model for each provider unless the provider hosts
 * models from multiple sources, in which case we include one model for each source. For example,
 * AWS Bedrock hosts models from five different sources (e.g. Anthropic, Cohere, etc), so we include
 * one model from each of these sources.
 */
export const SELECTED_TEST_MODELS: {
  [K in keyof typeof models]: string[]
} = {
  openai: ['gpt-5'],
  ai21: ['jamba-instruct'],
  anthropic: ['claude-sonnet-4-5'],
  gemini: ['gemini-2.5-pro'],
  cohere: ['command-a-03-2025'],
  bedrock: [
    'amazon.titan-text-express-v1',
    'anthropic.claude-3-5-sonnet-20241022-v2:0',
    'cohere.command-r-plus-v1:0',
    'meta.llama3-8b-instruct-v1:0',
    'mistral.mistral-large-2402-v1:0',
  ],
  mistral: ['mistral-large-2411'],
  groq: ['llama-3.3-70b-versatile'],
  perplexity: ['sonar-pro'],
  openrouter: [],
  'openai-compatible': [],
}
