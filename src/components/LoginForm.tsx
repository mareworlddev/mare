'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, TriangleAlert } from 'lucide-react';

import { MagicCard } from '@/components/ui/magic-card';
import { MareAvatar } from '@/components/Mare/MareIcon';
import { createClient } from '@/lib/supabase/client';
import { authCallbackUrl } from '@/lib/supabase/config';

interface OAuthProblem {
  title: string;
  detail: string;
}

const OAUTH_PROBLEMS: Record<string, OAuthProblem> = {
  not_configured: {
    title: 'Login indisponível',
    detail: 'O login não está disponível neste momento. Tente novamente mais tarde.',
  },
  oauth_canceled: {
    title: 'Login cancelado',
    detail: 'A janela do Google fechou sem concluir. Tente de novo quando quiser.',
  },
  oauth_failed: {
    title: 'Falha no login do Google',
    detail: 'Não foi possível concluir o login agora. Tente novamente em instantes.',
  },
};

const buttonCss =
  'flex h-11 w-full items-center justify-center gap-2.5 rounded-xl bg-mare-navy font-ui text-[14px] font-medium text-white ' +
  'outline-none transition hover:bg-mare-blue focus-visible:ring-2 focus-visible:ring-mare-sky/60 disabled:cursor-not-allowed disabled:opacity-70';

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);

  const problem = useMemo<OAuthProblem | null>(() => {
    const code = searchParams.get('error') || '';
    if (code && !configured) return OAUTH_PROBLEMS.not_configured;
    return OAUTH_PROBLEMS[code] || null;
  }, [searchParams, configured]);

  const signIn = async () => {
    if (!configured || pending) return;
    setPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: authCallbackUrl(window.location.origin),
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) {
        // Provedor desativado/domínio errado: a fila morre aqui, sem sair da tela.
        console.warn('mare:oauth-signin', error.message);
        setPending(false);
        router.replace('/login?error=oauth_failed');
      }
      // Em sucesso o navegador segue para o Google; esta tela fica em loading.
    } catch (cause) {
      console.warn('mare:oauth-signin', cause instanceof Error ? cause.message : cause);
      setPending(false);
      router.replace('/login?error=oauth_failed');
    }
  };

  return (
    <main className="relative isolate grid min-h-dvh place-items-center bg-mare-bg px-4 py-8">
      {/* Paisagem da Mare: encosta no rodapé da tela e some no branco do papel. */}
      <div className="mare-auth-scene" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-sm">
        <CardShell>
          <MagicCard
            gradientSize={260}
            gradientColor="#c7d8f588"
            gradientFrom="#7aa2e3"
            gradientTo="#0553af"
            className="mare-auth-card rounded-2xl"
          >
            <CardHeader>
              <MareAvatar size={44} />
              <h1 className="text-[22px] font-semibold leading-tight text-mare-navy">Entrar no Agente Mare</h1>
              <p className="font-ui text-[13.5px] text-mare-muted">
                Uma conta para conversas, projetos e quadros acompanharem você entre dispositivos.
              </p>
            </CardHeader>

            <CardContent>
              {problem ? (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3"
                >
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-rose-600" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-ui text-[13px] font-semibold text-rose-800">{problem.title}</p>
                    <p className="mt-0.5 font-ui text-[12.5px] text-rose-700/90">{problem.detail}</p>
                  </div>
                </div>
              ) : null}

              <button type="button" className={buttonCss} onClick={() => void signIn()} disabled={!configured || pending}>
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : (
                  <Image src="/logos/Google.webp" alt="" width={16} height={16} className="size-4" aria-hidden />
                )}
                {pending ? 'Abrindo o Google…' : 'Continuar com Google'}
              </button>

              <p className="mt-3 font-ui text-[11.5px] leading-snug text-mare-muted/90">
                Cancelou na janela do Google? Volte e escolha a conta de novo.
              </p>
            </CardContent>

            <CardFooter>
              <p className="font-ui text-[12px] text-mare-muted">
                Ao entrar, suas conversas, projetos e quadros acompanham você entre dispositivos.
              </p>
            </CardFooter>
          </MagicCard>
        </CardShell>
      </div>
    </main>
  );
}

/** Só a sombra: a borda (animada) é do MagicCard, para não duplicar o traço. */
function CardShell({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl shadow-[0_1px_2px_rgba(0,14,84,0.08),0_12px_40px_-12px_rgba(0,14,84,0.25)]">{children}</div>;
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center gap-2 border-b border-mare-line px-6 pb-5 pt-7 text-center">{children}</div>;
}

function CardContent({ children }: { children: React.ReactNode }) {
  return <div className="px-6 py-5">{children}</div>;
}

function CardFooter({ children }: { children: React.ReactNode }) {
  return <div className="border-t border-mare-line px-6 py-4">{children}</div>;
}
