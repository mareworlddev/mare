import { MARE_NIMBLE_ORCHESTRATOR } from '../../src/lib/mare/constants';
import { firecrawlScrape, firecrawlSearch } from '../../src/lib/mare/firecrawl';
import { providerChat } from '../../src/lib/mare/llm';
import { mareWarn, previewText } from '../../src/lib/mare/log';
import { pollinationsImageUrl } from '../../src/lib/pollinations';
import type { MareSource, MareToolCall, MareToolId } from '../../src/lib/mare/types';
import type { NimbleSkill } from './skill-router';

export interface NimblePage {
  url: string;
  title: string;
  text: string;
}

export interface NimbleEvidence {
  sources: MareSource[];
  pages: NimblePage[];
  toolCalls: MareToolCall[];
}

export interface ExecutorEvents {
  onTool?: (call: MareToolCall) => void;
  onSources?: (sources: MareSource[]) => void;
}

const tool = (name: string, summary: string, input: Record<string, unknown>): MareToolCall => ({
  id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name,
  server: 'nimble',
  summary: previewText(summary, 80),
  input,
  status: 'running',
});

function finish(call: MareToolCall, status: 'done' | 'error', output: string, startedAt: number) {
  return { ...call, status, output, duration: (Date.now() - startedAt) / 1000 };
}

/** Executa as ferramentas autorizadas pelas skills ativas e devolve a evidência. */
export async function collectEvidence(input: {
  text: string;
  tools: string[];
  enabledTools: MareToolId[];
  events?: ExecutorEvents;
}): Promise<NimbleEvidence> {
  const allowed = new Set(input.tools);
  const evidence: NimbleEvidence = { sources: [], pages: [], toolCalls: [] };
  const wantsSearch = allowed.has('web_search') && input.enabledTools.includes('web_search');

  if (wantsSearch && input.text.length > 2) {
    const startedAt = Date.now();
    const call = tool('web_search', input.text, { query: input.text.slice(0, 300), limit: 6 });
    evidence.toolCalls.push(call);
    input.events?.onTool?.(call);

    const found = await firecrawlSearch(input.text, 6);
    evidence.sources.push(...found);
    const done = finish(call, found.length ? 'done' : 'error', found.length ? `${found.length} fonte(s)` : 'Nenhuma fonte encontrada', startedAt);
    evidence.toolCalls[evidence.toolCalls.length - 1] = done;
    input.events?.onTool?.(done);
    if (found.length) input.events?.onSources?.(evidence.sources);
  }

  const url = input.text.match(/https?:\/\/[^\s]+/i)?.[0]?.replace(/[),.;]+$/, '');
  if (url && allowed.has('read_page') && input.enabledTools.includes('read_page')) {
    const startedAt = Date.now();
    const call = tool('read_page', url, { url });
    evidence.toolCalls.push(call);
    input.events?.onTool?.(call);

    const page = await firecrawlScrape(url);
    const done = finish(call, page ? 'done' : 'error', page ? `${page.title} · ${page.text.length} caracteres` : 'Página ilegível', startedAt);
    evidence.toolCalls[evidence.toolCalls.length - 1] = done;
    input.events?.onTool?.(done);
    if (page) {
      evidence.pages.push({ url, ...page });
      if (!evidence.sources.some((source) => source.url === url)) {
        evidence.sources.unshift({ title: page.title, url, snippet: previewText(page.text, 220), domain: new URL(url).hostname.replace(/^www\./, '') });
      }
      input.events?.onSources?.(evidence.sources);
    }
  }

  return evidence;
}

/** O orquestrador pensa em voz alta: plano curto antes de escrever. */
export async function planWithOrchestrator(input: {
  text: string;
  skills: NimbleSkill[];
  evidence: NimbleEvidence;
}): Promise<string> {
  const instructions = input.skills.map((skill) => `## ${skill.id}\n${skill.instructions}`).join('\n\n');
  const sources = input.evidence.sources
    .slice(0, 8)
    .map((source, index) => `${index + 1}. ${source.title} — ${source.url}\n${source.snippet || ''}`)
    .join('\n');

  try {
    const result = await providerChat({
      provider: MARE_NIMBLE_ORCHESTRATOR.provider,
      model: MARE_NIMBLE_ORCHESTRATOR.model,
      messages: [
        {
          role: 'system',
          content: [
            'Você é o orquestrador da Mare. Não escreva a resposta final.',
            'Produza um plano de execução curto (até 6 linhas) dizendo: o que a resposta precisa conter,',
            'quais evidências usar e onde há risco de erro ou falta de dado.',
            instructions,
          ].join('\n'),
        },
        { role: 'user', content: `Pedido: ${input.text}\n\nEvidências:\n${sources || 'nenhuma fonte coletada'}` },
      ],
      temperature: 0.2,
      maxTokens: 1500,
      timeoutMs: 45_000,
    });
    return result.content.trim();
  } catch (error) {
    mareWarn('nimble', 'orquestrador indisponível, seguindo sem plano', error instanceof Error ? error.message : error);
    return '';
  }
}

/** Imagem pedida pela skill image-prompt-engineer. */
export async function generateSkillImage(prompt: string, events?: ExecutorEvents): Promise<string | null> {
  const startedAt = Date.now();
  const call = tool('generate_image', prompt, { prompt: previewText(prompt, 200), model: 'microsoft/mai-image-2.7-flash' });
  events?.onTool?.(call);
  let url: string | null = null;
  try {
    // Valida a chave no servidor e entrega uma URL pública sem a chave.
    pollinationsImageUrl(prompt);
    url = `/api/mare/image?p=${encodeURIComponent(prompt.slice(0, 400))}`;
    return url;
  } catch (error) {
    mareWarn('nimble', 'geração de imagem falhou', error instanceof Error ? error.message : error);
    return null;
  } finally {
    events?.onTool?.(finish(call, url ? 'done' : 'error', url ? 'imagem gerada' : 'falhou', startedAt));
  }
}

/**
 * Nomes de ferramenta no prompt fazem o gpt-oss devolver tool_call em vez de texto.
 * O escritor recebe a instrução sem os nomes.
 */
function withoutToolNames(instructions: string) {
  return instructions
    .replace(/`?web_search`?/g, 'a busca já executada')
    .replace(/`?read_page`?/g, 'a leitura já executada')
    .replace(/\bimage\b/g, 'imagem');
}

/** Prompt do escritor: instruções das skills + plano + evidências. */
export function buildNimbleSystemPrompt(input: {
  skills: NimbleSkill[];
  plan: string;
  evidence: NimbleEvidence;
  imageUrl?: string | null;
}): string {
  const sources = input.evidence.sources
    .map((source, index) => `${index + 1}. ${source.title} — ${source.url}${source.snippet ? `\n   ${source.snippet}` : ''}`)
    .join('\n');

  return [
    'Você é a Mare, escrevendo a resposta final em português brasileiro.',
    'Seu nome é Mare. Nunca se apresente como ChatGPT, GPT ou produto de outra empresa.',
    'As ferramentas desta rodada já foram executadas. Não chame ferramentas nem devolva tool_calls: escreva a resposta final em texto.',
    'Siga as skills ativas, use as evidências e não invente dado, fonte, data ou valor.',
    input.skills
      .filter((skill) => skill.id !== 'tool-orchestrator')
      .map((skill) => `## ${skill.id}\n${withoutToolNames(skill.instructions)}`)
      .join('\n\n'),
    input.plan ? `PLANO DO ORQUESTRADOR:\n${input.plan}` : '',
    `EVIDÊNCIAS:\n${sources || 'nenhuma fonte coletada'}`,
    input.evidence.pages.length
      ? `TRECHOS LIDOS:\n${input.evidence.pages.map((page) => `${page.url}\n${page.text.slice(0, 4000)}`).join('\n\n')}`
      : '',
    input.imageUrl
      ? [
          `IMAGEM JÁ GERADA PELO MODELO ${'microsoft/mai-image-2.7-flash'}: ${input.imageUrl}`,
          'Você não gera imagens: a imagem já está pronta. Nunca diga que não consegue criar imagens.',
          `Descreva a imagem em uma frase e termine a resposta com ![descrição curta](${input.imageUrl}).`,
        ].join('\n')
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}
