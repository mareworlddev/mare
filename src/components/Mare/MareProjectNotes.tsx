'use client';

import { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bold, Italic, List, NotebookPen, Trash2 } from 'lucide-react';

import { markdownComponents } from './MareMarkdown';
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
  const [preview, setPreview] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const insert = (before: string, after = before, fallback = 'texto') => {
    const element = inputRef.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const selected = text.slice(start, end) || fallback;
    setText(`${text.slice(0, start)}${before}${selected}${after}${text.slice(end)}`);
    setPreview(false);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const submit = async () => {
    if (saving || !text.trim()) return;
    setSaving(true);
    setError('');
    try {
      await onCreate(text);
      setText('');
      setPreview(false);
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

  const markdown = (value: string) => (
    <div className="mare-ws-markdown mare-ws-notes-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {value}
      </ReactMarkdown>
    </div>
  );

  return (
    <section className="mare-ws-notes" aria-label="Notas do projeto">
      <div className="mare-ws-notes-head">
        <NotebookPen className="size-4" aria-hidden="true" />
        <h3>Notas e lembres</h3>
        <span className="mare-ws-board-count">{notes.length}</span>
      </div>

      <div className="mare-ws-notes-grid">
        <div className="mare-ws-notes-list-wrap">
          {notes.length ? (
            <ul className="mare-ws-notes-list">
              {notes.map((note) => (
                <li key={note.id}>
                  {markdown(note.content)}
                  <button
                    type="button"
                    aria-label="Excluir nota"
                    title="Excluir nota"
                    onClick={() => void remove(note.id)}
                  >
                    <Trash2 className="size-3" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mare-ws-notes-hint">Nenhuma nota ainda. Escreva à direita — markdown é aceito.</p>
          )}
        </div>

        <div className="mare-ws-notes-editor">
          <div className="mare-ws-notes-toolbar">
            <button type="button" onClick={() => insert('**')} aria-label="Negrito" title="Negrito">
              <Bold className="size-3.5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => insert('_')} aria-label="Itálico" title="Itálico">
              <Italic className="size-3.5" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => insert('\n- ', '', 'item')} aria-label="Lista" title="Lista">
              <List className="size-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="mare-ws-notes-toggle"
              onClick={() => setPreview((value) => !value)}
              aria-pressed={preview}
            >
              {preview ? 'Editar' : 'Prévia'}
            </button>
          </div>

          {preview && text.trim() ? (
            <div className="mare-ws-notes-preview">{markdown(text)}</div>
          ) : (
            <textarea
              ref={inputRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Anotação ou lembrete… use **negrito**, _itálico_ e - listas"
              aria-label="Nova nota do projeto em markdown"
              maxLength={2000}
            />
          )}

          <div className="mare-ws-notes-actions">
            <button type="button" disabled={saving || !text.trim()} onClick={() => void submit()}>
              {saving ? 'Salvando…' : 'Salvar nota'}
            </button>
          </div>
          {error ? <p role="alert">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}
