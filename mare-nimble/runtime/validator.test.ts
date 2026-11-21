import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { validateAnswer } from './validator.ts';

test('aceita resposta simples e curta', () => {
  assert.equal(validateAnswer({ answer: 'A resposta está pronta e objetiva.', requiresSources: false, sourceCount: 0, codeExpected: false }).ok, true);
});

test('reprova pesquisa sem fonte citada', () => {
  const result = validateAnswer({ answer: 'Fato afirmado sem citar nada.', requiresSources: true, sourceCount: 2, codeExpected: false });
  assert.equal(result.ok, false);
  assert.deepEqual(result.issues, ['as fontes coletadas não aparecem na resposta']);
});

test('reprova placeholder e bloco de código aberto', () => {
  const result = validateAnswer({ answer: 'Segue: [inserir aqui] ```ts\nconst a = 1;', requiresSources: false, sourceCount: 0, codeExpected: true });
  assert.equal(result.ok, false);
  assert.ok(result.issues.includes('sobrou marcador de preenchimento'));
  assert.ok(result.issues.includes('bloco de código sem fechamento'));
});
