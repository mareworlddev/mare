export interface ValidationInput {
  answer: string;
  requiresSources: boolean;
  sourceCount: number;
  codeExpected: boolean;
}

export interface Validation {
  ok: boolean;
  issues: string[];
}

/** Checagens baratas antes de entregar a resposta ao usuário. */
export function validateAnswer(input: ValidationInput): Validation {
  const issues: string[] = [];
  const answer = input.answer.trim();

  if (answer.length < 20) issues.push('resposta curta demais ou vazia');
  if (/\[(?:inserir|preencher|todo|tbd)[^\]]*\]|lorem ipsum/i.test(answer)) {
    issues.push('sobrou marcador de preenchimento');
  }
  if (input.requiresSources && input.sourceCount === 0) {
    issues.push('nenhuma fonte foi coletada para uma resposta que exige verificação');
  }
  if (input.requiresSources && input.sourceCount > 0 && !/https?:\/\//.test(answer)) {
    issues.push('as fontes coletadas não aparecem na resposta');
  }
  if (input.codeExpected) {
    const fences = (answer.match(/```/g) || []).length;
    if (fences > 0 && fences % 2 !== 0) issues.push('bloco de código sem fechamento');
  }

  return { ok: issues.length === 0, issues };
}
