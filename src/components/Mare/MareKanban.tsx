'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Library, Loader2, Plus, Sparkles, Trash2, X } from 'lucide-react';

import {
  MARE_STATUS_LABELS,
  MARE_TASK_STATUSES,
  createTask,
  deleteTask,
  listTasks,
  updateTask,
  type MareProject,
  type MareTask,
  type MareTaskStatus,
} from '@/lib/mare/projects';

type Props = {
  project: MareProject;
  onSendToMare: (task: MareTask) => void;
};

/**
 * Kanban do projeto: 4 colunas, cards arrastáveis (drag & drop nativo) e um
 * botão por card para mandar o card à Mare (ela desenha a lista de passos).
 * Tudo persiste no Supabase sob a RLS — o pente fino fica no banco.
 */
export function MareKanban({ project, onSendToMare }: Props) {
  const [tasks, setTasks] = useState<MareTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draggingId, setDraggingId] = useState('');
  const [dropTarget, setDropTarget] = useState<MareTaskStatus | null>(null);
  const [openComposer, setOpenComposer] = useState<MareTaskStatus | null>(null);
  const [composerText, setComposerText] = useState('');
  const draggingRef = useRef('');

  const load = useCallback(async (projectId: string) => {
    setLoading(true);
    setError('');
    try {
      setTasks(await listTasks(projectId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não consegui carregar o quadro.');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(project.id);
  }, [load, project.id]);

  const endDrag = () => {
    draggingRef.current = '';
    setDraggingId('');
    setDropTarget(null);
  };

  const patchTask = async (id: string, patch: Partial<Pick<MareTask, 'status' | 'position'>>) => {
    const before = tasks;
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...patch } : task)));
    try {
      await updateTask(id, patch);
    } catch (cause) {
      setTasks(before);
      setError(cause instanceof Error ? cause.message : 'Não consegui mover a tarefa.');
    }
  };

  const dropOn = (status: MareTaskStatus, beforeId?: string) => {
    const id = draggingRef.current || draggingId;
    endDrag();
    if (!id) return;
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    if (!beforeId) {
      // Fim da coluna: menor folga é max + 1.
      const top = tasks
        .filter((item) => item.id !== id && item.status === status)
        .reduce((max, item) => Math.max(max, item.position), 0);
      void patchTask(id, { status, position: top + 1 });
      return;
    }

    // Antes do card alvo: ponto médio entre o card de cima e o alvo.
    const ordered = tasks
      .filter((item) => item.status === status && item.id !== id)
      .sort((a, b) => a.position - b.position);
    const index = ordered.findIndex((item) => item.id === beforeId);
    if (index < 0) return;
    const above = index > 0 ? ordered[index - 1].position : 0;
    const position = (above + ordered[index].position) / 2;
    if (task.status === status && Math.abs(task.position - position) < 1e-6) return;
    void patchTask(id, { status, position });
  };

  const submitTask = async (status: MareTaskStatus) => {
    const title = composerText.trim();
    if (!title) {
      setOpenComposer(null);
      return;
    }
    setComposerText('');
    try {
      const top = tasks.filter((item) => item.status === status).reduce((max, item) => Math.max(max, item.position), 0);
      const created = await createTask(project.id, title, undefined, status, top + 1);
      setTasks((current) => [...current, created]);
      setOpenComposer(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não consegui criar a tarefa.');
    }
  };

  const removeTask = async (id: string) => {
    const before = tasks;
    setTasks((current) => current.filter((task) => task.id !== id));
    try {
      await deleteTask(id);
    } catch (cause) {
      setTasks(before);
      setError(cause instanceof Error ? cause.message : 'Não consegui excluir a tarefa.');
    }
  };

  return (
    <div
      className="mare-ws-board"
      onDragEnd={endDrag}
      onDrop={endDrag}
    >
      {loading ? (
        <div className="mare-ws-board-empty" role="status">
          <Loader2 className="size-5 animate-spin text-mare-blue" aria-hidden="true" />
          <p>Carregando o quadro…</p>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="mare-ws-board-empty" role="alert">
          <p className="mb-1 font-ui text-[13.5px] text-rose-700">{error}</p>
          <button
            type="button"
            onClick={() => void load(project.id)}
            className="h-8 rounded-lg bg-mare-navy px-3 font-ui text-[12.5px] text-white hover:bg-mare-blue"
          >
            Tentar de novo
          </button>
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="mare-ws-board-grid">
            {MARE_TASK_STATUSES.map((status) => {
              const column = tasks.filter((task) => task.status === status).sort((a, b) => a.position - b.position);
              return (
                <section
                  key={status}
                  aria-label={MARE_STATUS_LABELS[status]}
                  className={
                    'mare-ws-board-col' + (dropTarget === status && draggingId ? ' is-target' : '')
                  }
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (dropTarget !== status) setDropTarget(status);
                  }}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (dropTarget === status) dropOn(status);
                  }}
                >
                  <header className="mare-ws-board-col-head">
                    <h3>{MARE_STATUS_LABELS[status]}</h3>
                    <span className="mare-ws-board-count">{column.length}</span>
                    <button
                      type="button"
                      aria-label={`Nova tarefa em ${MARE_STATUS_LABELS[status]}`}
                      onClick={() => {
                        setOpenComposer(status);
                        setComposerText('');
                      }}
                      className="mare-ws-board-add"
                    >
                      <Plus className="size-3.5" aria-hidden="true" />
                    </button>
                  </header>

                  <div className="mare-ws-board-cards">
                    {column.map((task) => (
                      <article
                        key={task.id}
                        draggable
                        onDragStart={(event) => {
                          draggingRef.current = task.id;
                          setDraggingId(task.id);
                          event.dataTransfer.effectAllowed = 'move';
                          event.dataTransfer.setData('text/plain', task.title);
                        }}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          dropOn(status, task.id);
                        }}
                        className={
                          'mare-ws-card' + (draggingId === task.id ? ' is-dragging' : '')
                        }
                      >
                        <p className="mare-ws-card-title" title={task.title}>
                          {task.title}
                        </p>
                        {task.details ? <p className="mare-ws-card-details" title={task.details}>{task.details}</p> : null}
                        <div className="mare-ws-card-foot">
                          <select
                            aria-label={`Mover ${task.title}`}
                            value={task.status}
                            onChange={(event) => {
                              const status = event.target.value as MareTaskStatus;
                              if (status === task.status) return;
                              const top = tasks
                                .filter((item) => item.id !== task.id && item.status === status)
                                .reduce((max, item) => Math.max(max, item.position), 0);
                              void patchTask(task.id, { status, position: top + 1 });
                            }}
                            className="mare-ws-card-status"
                          >
                            {MARE_TASK_STATUSES.map((option) => (
                              <option key={option} value={option}>
                                {MARE_STATUS_LABELS[option]}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            title="Mandar para a Mare: ela monta a lista de passos"
                            aria-label={`Mandar ${task.title} para a Mare`}
                            onClick={() => onSendToMare(task)}
                            className="mare-ws-card-mare"
                          >
                            <Sparkles className="size-3.5" aria-hidden="true" />
                            Mare
                          </button>
                          <button
                            type="button"
                            aria-label={`Excluir ${task.title}`}
                            onClick={() => void removeTask(task.id)}
                            className="mare-ws-card-remove"
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </article>
                    ))}

                    {openComposer === status ? (
                      <form
                        className="mare-ws-card is-composing"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void submitTask(status);
                        }}
                      >
                        <input
                          autoFocus
                          value={composerText}
                          onChange={(event) => setComposerText(event.target.value)}
                          onKeyDown={(event) => event.key === 'Escape' && setOpenComposer(null)}
                          placeholder="O que precisa ser feito?"
                          aria-label={`Nova tarefa em ${MARE_STATUS_LABELS[status]}`}
                          maxLength={200}
                          className="mare-ws-card-input"
                        />
                        <div className="mare-ws-card-foot">
                          <button
                            type="submit"
                            disabled={!composerText.trim()}
                            className="mare-ws-card-mare disabled:opacity-50"
                          >
                            Adicionar
                          </button>
                          <button
                            type="button"
                            aria-label="Cancelar nova tarefa"
                            onClick={() => setOpenComposer(null)}
                            className="mare-ws-card-remove"
                          >
                            <X className="size-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>

          {tasks.length === 0 ? (
            <div className="mare-ws-board-hint">
              <Library className="size-4 text-mare-blue" aria-hidden="true" />
              <p>
                Quadro limpo. Crie cards com “＋” e mande um deles para a Mare quando quiser que ela
                desmonte a tarefa em passos.
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
