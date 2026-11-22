import type { SupabaseClient } from '@supabase/supabase-js';
import { mareWarn } from './log';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TITLE = 200;
const MAX_CONTENT = 60_000;

export function isMareUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export interface MirrorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface MirrorInput {
  conversationId: string;
  projectId?: string | null;
  title: string;
  messages: MirrorMessage[];
}

/**
 * Espelho durável da conversa nas tabelas chats/messages. Roda com o client
 * autenticado por cookie: a RLS decide o que pode — incluindo o WITH CHECK
 * que impede atrelar o chat a um projeto de outra pessoa. Best-effort: falha
 * do espelho nunca derruba a conversa, só avisa no log.
 */
export async function mirrorConversation(supabase: SupabaseClient, input: MirrorInput): Promise<void> {
  try {
    if (!isMareUuid(input.conversationId)) return;

    const projectId = input.projectId && isMareUuid(input.projectId) ? input.projectId : null;
    const { error: chatError } = await supabase
      .from('chats')
      .upsert(
        {
          id: input.conversationId,
          project_id: projectId,
          title: (input.title || 'Nova conversa').slice(0, MAX_TITLE),
        },
        { onConflict: 'id' }
      );
    if (chatError) throw chatError;

    const rows = Array.from(
      new Map(
        input.messages
          .filter((message) => {
            if (!message.id || !message.content) return false;
            if (message.role !== 'user' && message.role !== 'assistant') return false;
            // check messages_id_shape (4..64): um id ruim não mata o lote.
            const id = String(message.id);
            return id.length >= 4 && id.length <= 64;
          })
          .map((message) => [message.id, message])
      ).values()
    ).map((message) => ({
      id: String(message.id).slice(0, 64),
      chat_id: input.conversationId,
      role: message.role,
      content: message.content.slice(0, MAX_CONTENT),
    }));

    if (rows.length) {
      const { error: messageError } = await supabase
        .from('messages')
        .upsert(rows, { onConflict: 'chat_id,id', ignoreDuplicates: true });
      if (messageError) throw messageError;
    }
  } catch (error) {
    mareWarn('estado', 'espelho não salvou no Supabase', error instanceof Error ? error.message : error);
  }
}
