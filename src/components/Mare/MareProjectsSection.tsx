'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FolderKanban, Plus, Trash2, X } from 'lucide-react';

import type { MareProject } from '@/lib/mare/projects';

const iconButton =
  'grid size-6 place-items-center rounded-md text-mare-muted outline-none transition hover:bg-mare-soft hover:text-mare-navy focus-visible:ring-2 focus-visible:ring-mare-blue/40';

type Props = {
  projects: MareProject[];
  activeId: string | null;
  disabled: boolean;
  onCreate: (name: string) => Promise<MareProject | string>;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => Promise<void>;
};

/**
 * Projetos na sidebar: criar (nome único por usuário), escolher para abrir o
 * quadro e excluir. Erros do banco (nome repetido, migração pendente) aparecem
 * aqui, em PT-BR, sem expor detalhes de servidor.
 */
export function MareProjectsSection({ projects, activeId, disabled, onCreate, onSelect, onDelete }: Props) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);

  const submit = async () => {
    if (pending) return;
    setPending(true);
    setError('');
    const result = await onCreate(name);
    setPending(false);
    if (typeof result === 'string') {
      setError(result);
      return;
    }
    setName('');
    setCreating(false);
    onSelect(result.id);
  };

  const remove = async (id: string) => {
    setConfirming(null);
    try {
      await onDelete(id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não consegui excluir o projeto.');
    }
  };

  return (
    <section aria-label="Projetos" className="mt-1 px-1 pb-3">
      <div className="flex items-center justify-between px-1">
        <span className="font-ui text-[13px] font-semibold text-mare-navy">Projetos</span>
        <button
          type="button"
          aria-label="Novo projeto"
          aria-expanded={creating}
          disabled={disabled}
          onClick={() => {
            setCreating(current => !current);
            setError('');
          }}
          className={iconButton + ' size-8 rounded-lg disabled:opacity-40'}
        >
          {creating ? <X className="size-4" /> : <Plus className="size-4" />}
        </button>
      </div>

      {creating ? (
        <form
          className="mt-2 px-1"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === 'Escape' && setCreating(false)}
            placeholder="Nome do projeto"
            aria-label="Nome do projeto"
            maxLength={80}
            className="h-8 w-full rounded-lg border border-mare-blue/40 bg-white px-2.5 font-ui text-[13.5px] text-mare-ink outline-none focus:border-mare-blue"
          />
          <div className="mt-1.5 flex justify-end">
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="h-7 rounded-lg bg-mare-navy px-3 font-ui text-[12px] font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-mare-blue/40 hover:bg-mare-blue disabled:opacity-50"
            >
              Criar
            </button>
          </div>
        </form>
      ) : null}

      {error ? <p role="alert" className="mt-1.5 px-1 font-ui text-[12px] text-rose-700">{error}</p> : null}

      {projects.length ? (
        <ul className="mt-1">
          <AnimatePresence initial={false}>
            {projects.map((project) => {
              const active = project.id === activeId;
              return (
                <motion.li
                  key={project.id}
                  layout="position"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -8, transition: { duration: 0.15 } }}
                  transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                  className="group relative"
                >
                  {confirming === project.id ? (
                    <div
                      role="group"
                      aria-label={`Excluir ${project.name}?`}
                      className="relative flex h-8 items-center gap-1 rounded-lg bg-rose-50 pl-2.5 pr-1 font-ui text-[13px] shadow-[inset_0_0_0_1px_rgba(190,18,60,0.25)]"
                      onKeyDown={(event) => event.key === 'Escape' && setConfirming(null)}
                    >
                      <span className="min-w-0 flex-1 truncate text-rose-800">Excluir projeto?</span>
                      <button
                        type="button"
                        autoFocus
                        onClick={() => setConfirming(null)}
                        className="h-6 rounded-md px-2 font-ui text-[12px] text-mare-muted outline-none focus-visible:ring-2 focus-visible:ring-mare-blue/40 hover:bg-mare-navy/[0.06] hover:text-mare-navy"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(project.id)}
                        className="h-6 rounded-md bg-rose-700 px-2 font-ui text-[12px] font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-rose-300 hover:bg-rose-800"
                      >
                        Excluir
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        aria-current={active ? 'true' : undefined}
                        onClick={() => onSelect(project.id)}
                        className={
                          'relative block h-8 w-full truncate rounded-lg pl-8 text-left font-ui text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-mare-blue/40 group-focus-within:pr-11 group-hover:pr-11 ' +
                          (active
                            ? 'bg-mare-soft text-mare-navy shadow-[inset_0_0_0_1px_rgba(5,83,175,0.25)]'
                            : 'pr-2.5 text-mare-ink/80 hover:bg-mare-soft hover:text-mare-navy')
                        }
                      >
                        <FolderKanban
                          className={
                            'pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 ' +
                            (active ? 'text-mare-blue' : 'text-mare-muted')
                          }
                          aria-hidden="true"
                        />
                        {project.name}
                      </button>
                      <button
                        type="button"
                        aria-label={`Excluir ${project.name}`}
                        onClick={() => setConfirming(project.id)}
                        className={
                          iconButton +
                          ' hover:!text-rose-700 absolute right-1 top-1/2 -translate-y-1/2 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 ' +
                          (active ? 'opacity-100' : 'opacity-0')
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      ) : (
        <p className="px-2 py-2 font-ui text-[12px] leading-snug text-mare-muted/90">
          {disabled
            ? 'Entre na sua conta para usar projetos.'
            : 'Nenhum projeto ainda. Crie um para juntar tarefas e conversas.'}
        </p>
      )}
    </section>
  );
}
