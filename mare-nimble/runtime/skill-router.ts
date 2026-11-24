import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/** Uma skill executável: frontmatter decide quando ela entra, o corpo é a instrução. */
export interface NimbleSkill {
  id: string;
  priority: number;
  always: boolean;
  triggers: string[];
  tools: string[];
  instructions: string;
}

const SKILLS_DIR = path.join(process.cwd(), 'mare-nimble', 'skills');

// shortcut: cache em memória, editar um SKILL.md exige reiniciar o servidor.
const cache = new Map<string, NimbleSkill>();

function list(values: string) {
  return values
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((value) => value.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

function parseSkill(id: string, raw: string): NimbleSkill {
  const match = raw.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error(`SKILL.md sem frontmatter: ${id}`);

  const meta: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const entry = line.match(/^([\w-]+):\s*(.*)$/);
    if (entry) meta[entry[1]] = entry[2].trim();
  }

  return {
    id: meta.id || id,
    priority: Number(meta.priority || 99),
    always: meta.always === 'true',
    triggers: list(meta.triggers || '[]'),
    tools: list(meta.tools || '[]'),
    instructions: match[2].trim(),
  };
}

export function loadSkill(id: string): NimbleSkill | null {
  const cached = cache.get(id);
  if (cached) return cached;
  try {
    const skill = parseSkill(id, readFileSync(path.join(SKILLS_DIR, id, 'SKILL.md'), 'utf8'));
    cache.set(id, skill);
    return skill;
  } catch {
    return null;
  }
}

export function allSkills(): NimbleSkill[] {
  try {
    return readdirSync(SKILLS_DIR)
      .map((entry) => loadSkill(entry))
      .filter((skill): skill is NimbleSkill => Boolean(skill))
      .sort((a, b) => a.priority - b.priority);
  } catch {
    return [];
  }
}

/** Comando da interface -> skills do nimble. */
const COMMAND_SKILLS: Record<string, string[]> = {
  pesquisar: ['deep-research', 'fact-checker'],
  resumir: ['context-memory', 'response-quality'],
  planejar: ['reasoning-planner', 'tool-orchestrator'],
  escrever: ['response-quality'],
  revisar: ['self-correction', 'response-quality'],
  traduzir: ['response-quality'],
  ideias: ['reasoning-planner'],
  imagem: ['image-prompt-engineer'],
  codigo: ['coding-engineer', 'response-quality'],
};

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/**
 * Escolhe no máximo 4 skills: as marcadas `always`, o comando explícito
 * e as que casam com um gatilho no texto, na ordem de prioridade.
 */
export function routeSkills(text: string, command?: string, hints: string[] = []): NimbleSkill[] {
  const skills = allSkills();
  if (!skills.length) return [];

  const normalized = normalize(text);
  const selected = new Set<string>();
  for (const skill of skills) {
    if (skill.always) selected.add(skill.id);
  }
  for (const id of COMMAND_SKILLS[command || ''] || []) selected.add(id);

  const matched = skills
    .filter((skill) => skill.triggers.some((trigger) => normalized.includes(normalize(trigger))))
    .map((skill) => skill.id);

  const hinted = new Set(hints);
  return skills
    .filter((skill) => selected.has(skill.id) || matched.includes(skill.id))
    .sort((a, b) => Number(hinted.has(b.id)) - Number(hinted.has(a.id)) || a.priority - b.priority)
    .slice(0, 4);
}
