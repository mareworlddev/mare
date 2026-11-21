import type { Metadata } from 'next';
import MareWorkspace from '@/components/Mare/MareWorkspace';

export const metadata: Metadata = {
  title: 'Conversar com a Mare',
  description: 'Pesquise, planeje, escreva e revise com as ferramentas e skills da Mare.',
};

export default function MarePage() {
  return <MareWorkspace />;
}
