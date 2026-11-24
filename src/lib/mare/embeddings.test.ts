import assert from 'node:assert/strict';
import test from 'node:test';

import { embed } from './embeddings.ts';
import { selectRelevantNotes } from './prompts.ts';

const cosine = (a: number[], b: number[]) =>
  a.reduce((sum, value, index) => sum + value * b[index], 0);

test('embedding é normalizado e estável', () => {
  const first = embed('Como corrigir o bug no login?');
  const again = embed('Como corrigir o bug no login?');
  assert.equal(first.length, 256);
  assert.equal(cosine(first, first).toFixed(3), '1.000');
  assert.deepEqual(first, again);
});

test('pergunta repetida passa do limiar 0.95 e assunto diferente não', () => {
  const question = embed('Como corrigir o bug no login?');
  assert.ok(cosine(question, embed('Como corrigir o bug no login?')) > 0.95);
  assert.ok(cosine(question, embed('receita de bolo de cenoura')) < 0.5);
});

test('somente notas com termos da pergunta entram no contexto', () => {
  const notes = [
    'Login usa JWT com expiração de 15 minutos.',
    'O quadro kanban tem quatro colunas.',
    'Erro 401 no login veio do cookie expirado.',
  ];
  const selected = selectRelevantNotes(notes, 'Por que o login falha com 401?');
  assert.ok(selected.some((note) => note.includes('401')));
  assert.ok(!selected.some((note) => note.includes('kanban')));
});
