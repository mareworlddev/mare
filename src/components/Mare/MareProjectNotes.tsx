'use client';

import { useState } from 'react';
import { NotebookPen, Plus, Trash2 } from 'lucide-react';

import type { MareNote } from '@/lib/mare/projects';

type Props = {
  notes: MareNote[];
  onCreate: (content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

/** Anotações e lembretes do projeto — o contexto que a Mare consulta depois. */
export function MareProjectNotes({ notes, onCreate, onDelete }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (saving || !text.trim()) return;
    setSaving(true);
    setError('');
    try {
      await onCreate(text);
      setText('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não consegui salvar a nota.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await onDelete(id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não consegui excluir a nota.');
    }
  };

  return (
    <section className="mare-ws-notes" aria-label="Notas do projeto">
      <div className="mare-ws-notes-head">
        <NotebookPen className="size-3.5" aria-hidden="true" />
        <h3>Notas e lembres</h3>
        <span className="mare-ws-board-count">{notes.length}</span>
      </div>

      {notes.length ? (
        <ul className="mare-ws-notes-list">
          {notes.map((note) => (
            <li key={note.id}>
              <span>{note.content}</span>
              <button
                type="button"
                aria-label="Excluir nota"
                onClick={() => void remove(note.id)}
              >
                <Trash2 className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mare-ws-notes-add">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder="Anotação ou lembrete do projeto…"
          aria-label="Nova nota do projeto"
          maxLength={2000}
        />
        <button
          type="button"
          disabled={saving || !text.trim()}
          onClick={() => void submit()}
          aria-label="Salvar nota"
        >
          <Plus className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
