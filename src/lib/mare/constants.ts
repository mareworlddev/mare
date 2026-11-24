import type {
  MareSettings,
  MareSkillId,
  MareSpriteState,
  MareToolId,
} from './types';

export const MARE_NAME = 'Mare';

/** Voz da égua: educada, confiável, humana sem virar informal ou vaga. */
export const MARE_PERSONALITY = [
  'Você é Mare, uma égua de trabalho: educada, confiável e de palavra precisa.',
  'Seu tom é próprio, humanizado e sereno — nem robótico, nem informal, nem fraco.',
  'Escreva em português brasileiro. Vá ao que foi pedido, sem saudações vazias, sem emojis e sem encher a resposta de metáforas de campo.',
  'Quando uma comparação ajudar, use uma imagem breve do campo; a informação vem sempre primeiro.',
  'Prefira a solução menor que resolve: uma função simples antes de arquivos extras, interfaces ou dependências novas. Não crie estrutura para uso futuro.',
  'Nunca se apresente como ChatGPT, GPT ou produto de outra empresa.',
  'Nunca invente dado, fonte, valor, data ou citação. Quando faltar algo, diga exatamente o que falta.',
].join('\n');

/** Toda entrega termina com o que ficou de fora e o risco real disso. */
export const MARE_RISK_CLOSING = [
  'Feche TODA resposta com um bloco curto começando por "**Riscos e limites:**".',
  'Nele, diga objetivamente o que você não verificou ou pulou de propósito e qual risco real isso traz para quem for colocar a entrega em produção.',
  'No máximo duas linhas. Se nada for relevante, escreva apenas "**Riscos e limites:** nada relevante identificado nesta rodada."',
  'Nunca use o bloco para repetir a resposta nem para advertências genéricas.',
].join('\n');

/** Documento anexado: a resposta também aponta as consultas centrais do material. */
export const MARE_DOCUMENT_GUIDE = [
  'O usuário anexou documento(s) nesta rodada.',
  'Depois da resposta pedida, inclua uma seção curta "**Principais consultas do documento**" com até 5 itens:',
  'as perguntas, pedidos ou temas centrais que o texto traz, somente com base no material fornecido.',
  'Não transcreva o documento e não invente consultas que não estejam nele.',
].join('\n');

/** Modelo próprio: orquestra com Qwen na Cerebras e escreve com GPT-OSS na Pollinations. */
export const MARE_NIMBLE_MODEL = 'mare-nimble';
export const MARE_NIMBLE_ORCHESTRATOR = { provider: 'cerebras', model: 'qwen-3.8-27b' } as const;
export const MARE_NIMBLE_WRITER = { provider: 'pollinations', model: 'openai/gpt-oss-20b' } as const;

export const MARE_STATUS = {
  boot: ['Marchando ao objetivo', 'Abrindo a porteira', 'Firmando o casco'],
  think: ['Bufar para continuar', 'Trocando o passo', 'Medindo o terreno', 'Ouvindo o vento'],
  search: ['Rastreando o campo', 'Ouvindo o vento', 'Cruzando o terreno'],
  work: ['Mãos na rédea', 'Alinhando as ideias', 'Escrevendo com cuidado'],
  done: ['Chegando ao destino', 'Trabalho concluído'],
  error: ['Tropeçou na pedra', 'O caminho fechou', 'Precisamos ajustar o passo'],
} satisfies Record<string, string[]>;

export const MARE_SPRITES: Record<
  MareSpriteState,
  { row: number; frames: number; fps: number; loop: boolean; label: string }
> = {
  idle: { row: 0, frames: 6, fps: 4, loop: true, label: 'Mare em espera' },
  walk: { row: 1, frames: 6, fps: 6, loop: true, label: 'Mare marchando' },
  rear: { row: 2, frames: 6, fps: 9, loop: false, label: 'Mare empinando' },
  graze: { row: 3, frames: 6, fps: 5, loop: true, label: 'Mare pastando' },
  sleep: { row: 5, frames: 6, fps: 3, loop: true, label: 'Mare deitada' },
};

/** Folhas do pet ao lado do chat: cada uma com sua grade e proporção de quadro. */
export type MarePetSheet = 'watch' | 'chat' | 'outros' | 'eat' | 'drink' | 'scenery';

export const MARE_PET_SHEETS: Record<
  MarePetSheet,
  { src: string; cols: number; rows: number; /** largura ÷ altura do quadro */ frameRatio: number }
> = {
  watch: { src: '/mare/opt/sprite-sheet-1x8-olhando-mouse.png', cols: 8, rows: 1, frameRatio: 512 / 1024 },
  chat: { src: '/mare/opt/sprite-sheet-6x6-acoes-chat.png', cols: 6, rows: 6, frameRatio: 1 },
  outros: { src: '/mare/opt/sprite-sheet-5x8-outros-comportamentos.png', cols: 8, rows: 5, frameRatio: 1 },
  eat: { src: '/mare/opt/sprite-sheet-1x8-comendo-maca.png', cols: 8, rows: 1, frameRatio: 512 / 1024 },
  drink: { src: '/mare/opt/sprite-sheet-1x8-bebendo-agua.png', cols: 8, rows: 1, frameRatio: 512 / 1024 },
  /** Tufo de grama que fica no chão, atrás da Mare na sidebar (1×8, balançando). */
  scenery: { src: '/mare/opt/ambiente-mare.png', cols: 8, rows: 1, frameRatio: 512 / 1024 },
};

/** Linha animada de uma folha: quadros, cadência e se repete. */
export type MareSpriteRow = { row: number; frames: number; fps: number; loop: boolean; label: string };

/** Folha 6×6 (ações do chat), linha por comportamento — exibida durante a geração. */
export const MARE_CHAT_ROWS: Record<'look' | 'walk' | 'rear' | 'graze' | 'run' | 'lie', MareSpriteRow> = {
  look: { row: 0, frames: 6, fps: 4, loop: true, label: 'Mare olhando' },
  walk: { row: 1, frames: 6, fps: 6, loop: true, label: 'Mare andando devagar' },
  rear: { row: 2, frames: 6, fps: 9, loop: false, label: 'Mare empinando' },
  graze: { row: 3, frames: 6, fps: 5, loop: true, label: 'Mare comendo grama' },
  run: { row: 4, frames: 6, fps: 8, loop: true, label: 'Mare correndo' },
  lie: { row: 5, frames: 6, fps: 3, loop: true, label: 'Mare deitada, esperando' },
};

/** Folha 5×8 (outros comportamentos), linha por comportamento — lógica alternativa de espera. */
export const MARE_OUTROS_ROWS: MareSpriteRow[] = [
  { row: 0, frames: 8, fps: 4, loop: true, label: 'Mare olhando aleatoriamente, esperando' },
  { row: 1, frames: 8, fps: 5, loop: true, label: 'Mare pastando e comendo grama' },
  { row: 2, frames: 8, fps: 4, loop: true, label: 'Mare inclinando a cabeça, em dúvida' },
  { row: 3, frames: 8, fps: 3, loop: true, label: 'Mare deitada, esperando' },
  { row: 4, frames: 8, fps: 3, loop: true, label: 'Mare deitada, dormindo' },
];

/** Folhas 1×8 de comer e beber: uma volta dura 8 quadros. */
export const MARE_FEED_SHEETS = {
  eat: { frames: 8, fps: 6, label: 'Mare comendo maçã' },
  drink: { frames: 8, fps: 6, label: 'Mare bebendo água' },
} as const;

/** Colunas da folha "olhando o mouse" (0–7), na ordem do arquivo. */
export const MARE_WATCH_COLUMNS = [
  'olha para a esquerda',
  'olha para cima',
  'olha para a direita',
  'olha para baixo',
  'olha para a esquerda e para cima',
  'olha para a direita e para cima',
  'olha para a esquerda e para baixo',
  'olha para a direita e para baixo',
] as const;

export type MareSkillDefinition = {
  id: MareSkillId;
  command: string;
  label: string;
  hint: string;
  icon: string;
};

/** Skills aparecem como comandos de barra no compositor. */
export const MARE_SKILLS: MareSkillDefinition[] = [
  { id: 'pesquisar', command: 'pesquisar', label: 'Pesquisar', hint: 'Buscar na web com fontes', icon: 'search' },
  { id: 'resumir', command: 'resumir', label: 'Resumir', hint: 'Reduzir texto ao essencial', icon: 'list' },
  { id: 'planejar', command: 'planejar', label: 'Planejar', hint: 'Transformar objetivo em passos', icon: 'plan' },
  { id: 'escrever', command: 'escrever', label: 'Escrever', hint: 'Redigir com clareza e tom', icon: 'pen' },
  { id: 'revisar', command: 'revisar', label: 'Revisar', hint: 'Ajustar estilo e gramática', icon: 'check' },
  { id: 'traduzir', command: 'traduzir', label: 'Traduzir', hint: 'Traduzir mantendo o sentido', icon: 'languages' },
  { id: 'ideias', command: 'ideias', label: 'Ideias', hint: 'Explorar caminhos possíveis', icon: 'sparkles' },
  { id: 'codigo', command: 'codigo', label: 'Código', hint: 'Explicar ou escrever código', icon: 'code' },
];

/** Ferramentas que a Mare pode usar durante uma resposta. */
export const MARE_TOOLS: Array<{
  id: MareToolId;
  label: string;
  hint: string;
  server: string;
  icon: string;
}> = [
  { id: 'web_search', label: 'Pesquisa na web', hint: 'Fontes recentes', server: 'web', icon: 'search' },
  { id: 'read_page', label: 'Ler página', hint: 'Abrir uma URL', server: 'web', icon: 'book' },
];

export const MARE_DEFAULT_SETTINGS: MareSettings = {
  ambient: true,
  ambientVolume: 0.18,
  effects: true,
  effectsVolume: 0.5,
  voice: true,
  voiceVolume: 0.8,
  animations: true,
  webSearch: true,
  model: MARE_NIMBLE_MODEL,
  effort: 'Medium',
  fast: false,
  enabledTools: ['web_search', 'read_page'],
};



export const MARE_STARTERS = [
  { id: 'pesquisar', title: 'Pesquisar com fontes', detail: 'Um tema, várias fontes e um resumo honesto.', prompt: '/pesquisar ', icon: 'search' },
  { id: 'planejar', title: 'Planejar minha semana', detail: 'Objetivos viram passos possíveis.', prompt: '/planejar ', icon: 'plan' },
  { id: 'resumir', title: 'Resumir um texto', detail: 'Cole o material e peça o essencial.', prompt: '/resumir ', icon: 'list' },
  { id: 'ideias', title: 'Explorar ideias', detail: 'Caminhos diferentes para o mesmo problema.', prompt: '/ideias ', icon: 'sparkles' },
] as const;
