import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Registro do plugin Superpowers. A fonte é `skills/<nome>/SKILL.md`; a
 * leitura falha alto para que uma skill ausente nunca pareça registrada.
 */
export interface SuperpowerSkill {
  name: string;
  description: string;
  body: string;
}

const SKILLS_DIR = path.join(process.cwd(), 'mare-nimble', 'superpowers', 'skills');

const NAMES = [
  'using-superpowers',
  'brainstorming',
  'writing-plans',
  'systematic-debugging',
  'verification-before-completion',
  'dispatching-parallel-agents',
  'writing-skills',
] as const;

/** Carregadas integralmente só quando /planejar precisa delas. */
const PLANEJAR = ['brainstorming', 'writing-plans', 'verification-before-completion'] as const;

const cache = new Map<string, SuperpowerSkill>();

export function loadSuperpower(name: string): SuperpowerSkill {
  const cached = cache.get(name);
  if (cached) return cached;

  const raw = readFileSync(path.join(SKILLS_DIR, name, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error(`Superpowers: SKILL.md sem frontmatter (${name}).`);

  const meta: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const entry = line.match(/^([\w-]+):\s*(.*)$/);
    if (entry) meta[entry[1]] = entry[2].trim();
  }
  if (meta.name !== name || !meta.description) {
    throw new Error(`Superpowers: frontmatter inválido (${name}).`);
  }

  const skill: SuperpowerSkill = {
    name: meta.name,
    description: meta.description,
    body: match[2].trim(),
  };
  cache.set(name, skill);
  return skill;
}

/** Nomes e descrições das sete skills, disponíveis no início da tarefa. */
export function superpowerSummaries(): string[] {
  return NAMES.map((name) => {
    const skill = loadSuperpower(name);
    return `- ${skill.name}: ${skill.description}`;
  });
}

/** Orientação + instruções completas das skills que /planejar realmente usa. */
export function planejarSuperpowers(): SuperpowerSkill[] {
  return [loadSuperpower('using-superpowers'), ...PLANEJAR.map(loadSuperpower)];
}
