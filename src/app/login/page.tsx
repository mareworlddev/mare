import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/LoginForm';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Entrar',
  description: 'Conversas, projetos e quadros do Agente Mare na sua conta.',
};

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) redirect('/mare');
    } catch {
      // Sessão/refresh falhou: segue para a tela de login com o motivo.
    }
  }

  return (
    <Suspense>
      <LoginForm configured={isSupabaseConfigured()} />
    </Suspense>
  );
}
