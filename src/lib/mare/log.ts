/**
 * Logs padronizados das camadas da Mare.
 *
 * Cada camada usa um escopo fixo para facilitar o filtro no console:
 * [Mare][provedor], [Mare][nimble], [Mare][pesquisa], [Mare][agente], ...
 */

export type MareLogScope =
  | 'provedor'
  | 'nimble'
  | 'pesquisa'
  | 'anexo'
  | 'agente'
  | 'rota'
  | 'cliente'
  | 'imagem'
  | 'catalogo'
  | 'sprite'
  | 'estado';

function prefix(scope: MareLogScope) {
  return `[Mare][${scope}]`;
}

export function mareLog(scope: MareLogScope, message: string, data?: unknown) {
  if (data === undefined) {
    console.log(`${prefix(scope)} ${message}`);
    return;
  }
  console.log(`${prefix(scope)} ${message}`, data);
}

export function mareWarn(scope: MareLogScope, message: string, data?: unknown) {
  if (data === undefined) {
    console.warn(`${prefix(scope)} ${message}`);
    return;
  }
  console.warn(`${prefix(scope)} ${message}`, data);
}

/** Cronômetro simples para medir cada etapa do agente. */
export function mareTimer(scope: MareLogScope, label: string) {
  const startedAt = Date.now();
  return {
    elapsed() {
      return Date.now() - startedAt;
    },
    mark(message: string, data?: unknown) {
      mareLog(scope, `${label} · +${Date.now() - startedAt}ms · ${message}`, data);
    },
    done(message = 'concluído', data?: unknown) {
      mareLog(scope, `${label} · ${message} em ${Date.now() - startedAt}ms`, data);
    },
  };
}

/** Resume um texto para o console sem despejar respostas inteiras. */
export function previewText(value: unknown, max = 140) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
