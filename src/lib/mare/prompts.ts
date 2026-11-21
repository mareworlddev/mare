import { MARE_NAME } from './constants';
import type { MareSkillId, MareSource } from './types';

/** Instrução curta por comando da interface. O nimble usa as skills de `mare-nimble/skills`. */
const SKILL_GUIDE: Record<MareSkillId, string> = {
  conversar: 'Responda direto ao que foi pedido. Se faltar contexto essencial, faça uma pergunta específica.',
  pesquisar: 'Use as fontes coletadas, compare o que elas dizem e cite a origem de cada afirmação externa.',
  resumir: 'Reduza o material ao essencial sem perder números, nomes nem conclusões.',
  planejar: 'Transforme o objetivo em passos concretos, ordenados e executáveis.',
  escrever: 'Escreva o texto final pedido, sem inventar dados nem fontes.',
  revisar: 'Aponte os problemas encontrados e entregue a versão corrigida.',
  traduzir: 'Traduza preservando sentido, tom e registro; avise sobre ambiguidades.',
  ideias: 'Explore caminhos distintos, com prós, contras e uma recomendação.',
  imagem:
    'Descreva a imagem em uma frase e inclua o markdown ![descrição](url) com a URL gerada, sem inventar outra imagem.',
  codigo: 'Entregue código executável, explique as decisões e trate os erros previsíveis.',
};

export function buildDirectSystemPrompt(options: {
  skill: MareSkillId;
  sources?: MareSource[];
  webSearch?: boolean;
}): string {
  const sources = options.sources?.length
    ? options.sources
        .slice(0, 8)
        .map((source, index) => `${index + 1}. ${source.title} — ${source.url}${source.snippet ? `\n   ${source.snippet}` : ''}`)
        .join('\n')
    : 'Nenhuma fonte externa foi coletada nesta rodada.';

  return [
    `Você é ${MARE_NAME}, uma agente que responde em português brasileiro com precisão.`,
    'Nunca se apresente como ChatGPT, GPT ou produto de outra empresa.',
    'Nunca invente dado, fonte, valor, data ou citação. Quando não souber, diga o que falta.',
    SKILL_GUIDE[options.skill],
    '',
    'FONTES DESTA RODADA:',
    sources,
    options.webSearch
      ? 'Use apenas estas fontes e mencione quando a informação vier delas.'
      : 'A pesquisa na web estava desligada; sinalize os limites da resposta.',
  ].join('\n');
}

export function buildConversationMessages(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  system: string
) {
  return [
    { role: 'system' as const, content: system },
    ...messages.slice(-12).map((message) => ({
      role: message.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: message.content.slice(0, 12000),
    })),
  ];
}

export function inferSkill(text: string): MareSkillId {
  const value = text.toLowerCase();
  if (/(pesquis|procure|busque|fontes|notícias|noticias)/.test(value)) return 'pesquisar';
  if (/(resum|sintetiz|resumo)/.test(value)) return 'resumir';
  if (/(planej|plano|cronograma|passo a passo|organiza)/.test(value)) return 'planejar';
  if (/(traduz|tradução|traducao)/.test(value)) return 'traduzir';
  if (/(revis|corrig|gramática|gramatica|estilo)/.test(value)) return 'revisar';
  if (/(ideia|brainstorm|sugira opções|alternativas)/.test(value)) return 'ideias';
  if (/(código|codigo|função|funcao|bug|typescript|javascript|python)/.test(value)) return 'codigo';
  if (/(escreva|redija|texto para|escrever)/.test(value)) return 'escrever';
  return 'conversar';
}
