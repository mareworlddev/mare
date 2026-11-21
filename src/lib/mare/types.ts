export type MareSkillId =
  | 'conversar'
  | 'pesquisar'
  | 'resumir'
  | 'planejar'
  | 'escrever'
  | 'revisar'
  | 'traduzir'
  | 'ideias'
  | 'imagem'
  | 'codigo';

export type MareToolId = 'web_search' | 'read_page';

export type MareMentionId = 'web' | 'ferramentas' | 'skills';

export type MareEffort = 'Minimal' | 'Low' | 'Medium' | 'High' | 'Extra high' | 'Ultra';

export interface MareSource {
  title: string;
  url: string;
  snippet?: string;
  domain?: string;
}

export interface MareToolCall {
  id: string;
  name: string;
  server?: string;
  summary: string;
  input: Record<string, unknown>;
  output?: string;
  status: 'pending' | 'running' | 'done' | 'error';
  duration?: number;
}

/** Tokens que a rodada consumiu; `estimated` quando a API não devolveu uso. */
export interface MareTokenUsage {
  input: number;
  output: number;
  total: number;
  estimated?: boolean;
}

/** Documento já lido, guardado na mensagem para seguir como contexto. */
export interface MareMessageAttachment {
  name: string;
  kind: 'pdf' | 'doc' | 'sheet' | 'slides' | 'text';
  size: string;
  text: string;
  truncated?: boolean;
}

export interface MareMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  attachments?: MareMessageAttachment[];
  tokens?: MareTokenUsage;
  skill?: MareSkillId;
  label?: string;
  reasoning?: string;
  sources?: MareSource[];
  toolCalls?: MareToolCall[];
}

export interface MareConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: MareMessage[];
}

export interface MareSettings {
  ambient: boolean;
  ambientVolume: number;
  effects: boolean;
  effectsVolume: number;
  voice: boolean;
  voiceVolume: number;
  animations: boolean;
  webSearch: boolean;
  model: string;
  effort: MareEffort;
  fast: boolean;
  enabledTools: MareToolId[];
}

export interface MarePersistedState {
  conversations: MareConversation[];
  activeId: string;
  settings: MareSettings;
  updatedAt: string;
}

export interface MareChatBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  skill?: MareSkillId;
  tool?: MareToolId;
  settings?: Partial<MareSettings>;
  model?: string;
  effort?: MareEffort;
  source?: string;
  stream?: boolean;
}

export type MareStreamEvent =
  | { type: 'status'; text: string; state?: MareSpriteState }
  | { type: 'thought'; text: string }
  | { type: 'delta'; text: string }
  | { type: 'sources'; sources: MareSource[] }
  | { type: 'tool'; call: MareToolCall }
  | { type: 'message'; message: MareMessage }
  | { type: 'error'; error: string }
  | { type: 'done' };

export type MareSpriteState = 'idle' | 'walk' | 'rear' | 'graze' | 'sleep';

/** Fase da geração da resposta, usada para escolher a linha da folha 6×6 / 5×8. */
export type MareGenerationPhase = 'thinking' | 'tool' | 'writing' | 'wrapping';

export type MareFeedKind = 'eat' | 'drink';
