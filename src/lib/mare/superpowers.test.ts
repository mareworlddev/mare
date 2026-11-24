import assert from 'node:assert/strict';
import test from 'node:test';

import { loadSuperpower, planejarSuperpowers, superpowerSummaries } from './superpowers.ts';

test('registro expõe as sete skills com nome e descrição', () => {
  const summaries = superpowerSummaries();
  assert.equal(summaries.length, 7);
  assert.ok(summaries.some((line) => line.startsWith('- writing-plans: ')));
  assert.ok(summaries.some((line) => line.startsWith('- using-superpowers: ')));
});

test('/planejar carrega orientação e apenas as skills do fluxo', () => {
  const skills = planejarSuperpowers();
  assert.deepEqual(
    skills.map((skill) => skill.name),
    ['using-superpowers', 'brainstorming', 'writing-plans', 'verification-before-completion']
  );
  assert.ok(skills.every((skill) => skill.body.length > 100));
});

test('skill ausente falha alto em vez de virar sucesso silencioso', () => {
  assert.throws(() => loadSuperpower('skill-que-nao-existe'), /ENOENT/);
});
