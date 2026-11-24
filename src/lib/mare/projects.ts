import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';

/**
 * Camada de dados de projetos e tarefas (kanban) — direto no PostgREST do
 * Supabase com o token do usuário no cookie. A RLS decide o que passa: nunca
 * dá para tocar em linha de outro usuário, nem atrelar tarefa a projeto alheio.
 */

export type MareTaskStatus = 'backlog' | 'todo' | 'doing' | 'done';

export const MARE_TASK_STATUSES: MareTaskStatus[] = ['backlog', 'todo', 'doing', 'done'];

export const MARE_STATUS_LABELS: Record<MareTaskStatus, string> = {
  backlog: 'Ideias',
  todo: 'A fazer',
  doing: 'Fazendo',
  done: 'Feito',
};

export interface MareProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface MareTask {
  id: string;
  projectId: string;
  title: string;
  details: string | null;
  status: MareTaskStatus;
  position: number;
  createdAt: string;
  updatedAt: string;
}

/** Anotação/lembrete do usuário dentro de um projeto. */
export interface MareNote {
  id: string;
  projectId: string;
  content: string;
  createdAt: string;
}

function requireSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    console.warn('mare:projects Supabase ausente — defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
    throw new Error('Projetos indisponíveis agora. Tente novamente mais tarde.');
  }
  return createClient();
}

/** Mensagem para o usuário + detalhe técnico só no console (não vaza interna). */
function friendlySupabaseError(error: { code?: string; message?: string }, fallback: string): Error {
  if (error.code === '23505') return new Error('Já existe um projeto com esse nome.');
  if (error.code === '23514') return new Error('Valor fora do permitido (nome/título/limites).');
  if (error.code === '42501' || error.code === 'PGRST301') return new Error('Entre na sua conta para usar projetos.');
  if (error.code === '42P01' || error.code === 'PGRST202') {
    console.warn('mare:projects', error.code, error.message);
    return new Error('Serviço de projetos indisponível no momento. Tente novamente mais tarde.');
  }
  if (error.code) console.warn('mare:projects', error.code, error.message);
  return new Error(fallback);
}

export function projectPayload(name: string): string {
  return name.trim().slice(0, 80);
}

export async function listProjects(): Promise<MareProject[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, created_at, updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw friendlySupabaseError(error, 'Não consegui carregar os projetos.');
  return (data || []).map((row: any) => ({
    id: String(row.id),
    name: String(row.name),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

export async function createProject(name: string): Promise<MareProject> {
  const supabase = requireSupabase();
  const clean = projectPayload(name);
  if (!clean) throw new Error('Dê um nome ao projeto.');
  const { data, error } = await supabase
    .from('projects')
    .insert({ name: clean })
    .select('id, name, created_at, updated_at')
    .single();
  if (error) throw friendlySupabaseError(error, 'Não consegui criar o projeto.');
  return {
    id: String(data.id),
    name: String(data.name),
    createdAt: String(data.created_at),
    updatedAt: String(data.updated_at),
  };
}

export async function deleteProject(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw friendlySupabaseError(error, 'Não consegui excluir o projeto.');
}

function taskOf(row: any): MareTask {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    title: String(row.title),
    details: row.details == null ? null : String(row.details),
    status: (MARE_TASK_STATUSES.includes(row.status) ? row.status : 'backlog') as MareTaskStatus,
    position: Number(row.position) || 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listTasks(projectId: string): Promise<MareTask[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('tasks')
    .select('id, project_id, title, details, status, position, created_at, updated_at')
    .eq('project_id', projectId)
    .order('position', { ascending: true });
  if (error) throw friendlySupabaseError(error, 'Não consegui carregar as tarefas.');
  return (data || []).map(taskOf);
}

export async function createTask(
  projectId: string,
  title: string,
  details?: string,
  status: MareTaskStatus = 'backlog',
  position?: number
): Promise<MareTask> {
  const supabase = requireSupabase();
  const cleanTitle = title.trim().slice(0, 200);
  if (!cleanTitle) throw new Error('Dê um título à tarefa.');
  const cleanDetails = details?.trim() ? details.trim().slice(0, 4000) : null;
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id: projectId,
      title: cleanTitle,
      ...(cleanDetails ? { details: cleanDetails } : {}),
      status,
      ...(typeof position === 'number' ? { position } : {}),
    })
    .select('id, project_id, title, details, status, position, created_at, updated_at')
    .single();
  if (error) throw friendlySupabaseError(error, 'Não consegui criar a tarefa.');
  return taskOf(data);
}

export async function updateTask(id: string, patch: Partial<Pick<MareTask, 'title' | 'details' | 'status' | 'position'>>): Promise<void> {
  const supabase = requireSupabase();
  const body: Record<string, unknown> = {};
  if (patch.title !== undefined) body.title = patch.title.trim().slice(0, 200);
  if (patch.details !== undefined && patch.details !== null) body.details = patch.details.trim().slice(0, 4000);
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.position !== undefined) body.position = patch.position;
  if (!Object.keys(body).length) return;
  const { error } = await supabase.from('tasks').update(body).eq('id', id);
  if (error) throw friendlySupabaseError(error, 'Não consegui atualizar a tarefa.');
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw friendlySupabaseError(error, 'Não consegui excluir a tarefa.');
}

function noteOf(row: any): MareNote {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    content: String(row.content),
    createdAt: String(row.created_at),
  };
}

export async function listNotes(projectId: string): Promise<MareNote[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('project_notes')
    .select('id, project_id, content, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw friendlySupabaseError(error, 'Não consegui carregar as notas.');
  return (data || []).map(noteOf);
}

export async function createNote(projectId: string, content: string): Promise<MareNote> {
  const supabase = requireSupabase();
  const clean = content.trim().slice(0, 2000);
  if (!clean) throw new Error('Escreva a anotação.');
  const { data, error } = await supabase
    .from('project_notes')
    .insert({ project_id: projectId, content: clean })
    .select('id, project_id, content, created_at')
    .single();
  if (error) throw friendlySupabaseError(error, 'Não consegui salvar a anotação.');
  return noteOf(data);
}

export async function deleteNote(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('project_notes').delete().eq('id', id);
  if (error) throw friendlySupabaseError(error, 'Não consegui excluir a anotação.');
}
