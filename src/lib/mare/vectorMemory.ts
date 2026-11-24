import type { SupabaseClient } from '@supabase/supabase-js';

import { allSkills } from '../../../mare-nimble/runtime/skill-router';
import { embed, pgVector } from './embeddings';
import { mareWarn } from './log';

/** Só respostas quase idênticas voltam do cache: melhor errar para não responder errado. */
export const CACHE_MIN_SIMILARITY = 0.95;
const SKILL_MIN_SIMILARITY = 0.15;

type Match = {
  id: string;
  ref_id: string;
  project_id: string | null;
  content: string | null;
  answer: string | null;
  model: string | null;
  skill: string | null;
  similarity: number;
};

async function match(
  supabase: SupabaseClient,
  text: string,
  kinds: string[],
  minSimilarity: number,
  matchCount: number,
  projectId?: string | null
): Promise<Match[]> {
  const { data, error } = await supabase.rpc('match_mare_vectors', {
    query_embedding: pgVector(embed(text)),
    match_count: matchCount,
    min_similarity: minSimilarity,
    kinds,
    project_filter: projectId || null,
  });
  if (error) {
    mareWarn('pgvector', 'busca por similaridade falhou', error.message);
    return [];
  }
  return (data || []) as Match[];
}

/** Cache semântico: devolve a resposta antiga antes de gastar tokens com o modelo. */
export async function lookupCache(
  supabase: SupabaseClient,
  text: string,
  model: string,
  skill?: string,
  projectId?: string | null
): Promise<string | null> {
  if (!text.trim()) return null;
  try {
    const hits = await match(supabase, text, ['qa'], CACHE_MIN_SIMILARITY, 8);
    const hit = hits.find((item) =>
      item.model === model &&
      (!skill || !item.skill || item.skill === skill) &&
      (projectId ? item.project_id === projectId : !item.project_id)
    );
    return typeof hit?.answer === 'string' && hit.answer.trim() ? hit.answer : null;
  } catch (error) {
    mareWarn('pgvector', 'cache indisponível', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function rememberCache(
  supabase: SupabaseClient,
  input: { question: string; answer: string; model: string; skill?: string; projectId?: string | null }
): Promise<void> {
  if (!input.question.trim() || !input.answer.trim()) return;
  try {
    const { error } = await supabase.from('mare_vector_memory').insert({
      kind: 'qa',
      ref_id: 'qa',
      project_id: input.projectId || null,
      content: input.question.slice(0, 6000),
      answer: input.answer.slice(0, 60000),
      model: input.model,
      skill: input.skill || null,
      embedding: pgVector(embed(input.question)),
    });
    if (error) mareWarn('pgvector', 'não conseguiu gravar cache', error.message);
  } catch (error) {
    mareWarn('pgvector', 'não conseguiu gravar cache', error instanceof Error ? error.message : error);
  }
}

/** Primeira rodada de cada usuário semeia os embeddings das skills que ele usa. */
export async function seedSkillVectors(supabase: SupabaseClient): Promise<void> {
  try {
    const skills = allSkills();
    if (!skills.length) return;
    const { data: existing } = await supabase
      .from('mare_vector_memory')
      .select('ref_id')
      .eq('kind', 'skill');
    const have = new Set((existing || []).map((row: any) => String(row.ref_id)));
    const missing = skills.filter((skill) => !have.has(skill.id));
    if (!missing.length) return;

    const rows = missing.map((skill) => {
      const content = `${skill.id} ${skill.triggers.join(' ')} ${skill.instructions}`.slice(0, 6000);
      return {
        kind: 'skill',
        ref_id: skill.id,
        content,
        skill: skill.id,
        embedding: pgVector(embed(content)),
      };
    });
    const { error } = await supabase.from('mare_vector_memory').insert(rows);
    if (error) mareWarn('pgvector', 'não conseguiu indexar skills', error.message);
  } catch (error) {
    mareWarn('pgvector', 'não conseguiu indexar skills', error instanceof Error ? error.message : error);
  }
}

/** Dicas de skills para o roteador: apenas reforçam skills que já existem. */
export async function retrieveSkillHints(supabase: SupabaseClient, text: string): Promise<string[]> {
  try {
    const hits = await match(supabase, text, ['skill'], SKILL_MIN_SIMILARITY, 3);
    return hits.map((item) => item.ref_id).filter(Boolean);
  } catch {
    return [];
  }
}

/** Trechos do projeto que conversam com a pergunta, já filtrados pelo dono. */
export async function retrieveProjectNotes(
  supabase: SupabaseClient,
  projectId: string,
  text: string
): Promise<string[]> {
  try {
    const hits = await match(supabase, text, ['note'], SKILL_MIN_SIMILARITY, 5, projectId);
    return hits.map((item) => (item.content || '').slice(0, 600)).filter(Boolean);
  } catch {
    return [];
  }
}
