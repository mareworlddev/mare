/** Modelos que o usuário pode escolher na conversa. */
export const MARE_AI_MODELS = [
  {
    id: 'openai/gpt-5-nano',
    label: 'GPT-5 Nano',
    company: 'Pollinations',
  },
  {
    id: 'openai/gpt-oss-20b',
    label: 'GPT-OSS 20B',
    company: 'Pollinations',
  },
  {
    id: 'mare-nimble',
    label: 'Mare Nimble',
    company: 'Mare',
  },
] as const;

export type MareAiModelId = (typeof MARE_AI_MODELS)[number]['id'];

export const MARE_AI_MODEL_IDS = MARE_AI_MODELS.map((model) => model.id) as MareAiModelId[];

export const DEFAULT_MARE_AI_MODEL: MareAiModelId = 'mare-nimble';

export function isMareAiModelId(model: string): model is MareAiModelId {
  return MARE_AI_MODEL_IDS.includes(model as MareAiModelId);
}
