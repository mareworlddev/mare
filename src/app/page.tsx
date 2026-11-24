import Link from 'next/link';
import {
  ArrowRight,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  Code2,
  FileText,
  Languages,
  ListChecks,
  PenLine,
  Route,
  Search,
  Sparkles,
} from 'lucide-react';
import { MessageBubble } from '@/components/Mare/MareMessageBubble';
import { MareAvatar } from '@/components/Mare/MareIcon';
import { AnimatedPetSprite } from '@/components/Mare/MareSprite';
import { ChatCycleMare, OutrosCycleMare, WatchMare } from '@/components/Mare/LandingMare';
import { DitherField } from '@/components/ui/dither-field';

const skills = [
  { icon: Search, title: 'Pesquisar', text: 'Busca na web e resume o que as fontes dizem.' },
  { icon: ListChecks, title: 'Resumir', text: 'Texto longo vira o essencial, com nomes e números.' },
  { icon: Route, title: 'Planejar', text: 'Objetivo vira passos ordenados e possíveis.' },
  { icon: PenLine, title: 'Escrever', text: 'Texto pronto para usar, com começo e fecho.' },
  { icon: CheckCircle2, title: 'Revisar', text: 'Clareza, gramática e precisão, com a versão final.' },
  { icon: Languages, title: 'Traduzir', text: 'Mantém sentido e tom, e marca o que é ambíguo.' },
  { icon: Sparkles, title: 'Gerar ideias', text: 'Caminhos diferentes para o mesmo desafio, com recomendação.' },
  { icon: Code2, title: 'Escrever código', text: 'Explicação e exemplo executável, com o porquê das escolhas.' },
];

const tools = [
  {
    icon: Search,
    title: 'Pesquisar na web',
    text: 'Fontes recentes entram na conversa quando o assunto pede contexto. A lista abre na mensagem.',
  },
  {
    icon: BookOpen,
    title: 'Ler página',
    text: 'Cole um endereço e a Mare usa o conteúdo da página como material de trabalho.',
  },
];

const steps = [
  { title: 'Envie o pedido', text: 'Linguagem natural ou uma skill com / no começo da mensagem.' },
  { title: 'A Mare escolhe', text: 'Skill e ferramentas ligadas entram na rodada.' },
  { title: 'Você lê o caminho', text: 'Pensamentos, chamadas de ferramenta e fontes aparecem na conversa.' },
  { title: 'Use a resposta', text: 'Texto, plano ou código, pronto para o próximo passo.' },
];

const faq = [
  {
    question: 'Precisa instalar alguma coisa?',
    answer: 'Não. A conversa abre no navegador e o histórico fica salvo por cliente.',
  },
  {
    question: 'Como vejo as fontes?',
    answer: 'Cada pesquisa abre a lista de fontes na mensagem, com endereço e resumo do que foi achado.',
  },
  {
    question: 'O que a Mare não faz?',
    answer: 'Ela não substitui a revisão final. Confira números e nomes nas fontes antes de publicar.',
  },
  {
    question: 'Posso desligar uma ferramenta?',
    answer: 'Sim. O menu de ferramentas no campo de mensagem liga e desliga cada uma.',
  },
];

export default function HomePage() {
  return (
    <div className="landing landing--pitch">
      <nav className="landing-nav">
        <div className="landing-container wrap landing-nav-inner">
          <Link href="/" className="landing-brand" aria-label="Agente Mare — início">
            <MareAvatar size={38} />
            <span className="landing-brand-name">
              <strong>Mare</strong>
            </span>
          </Link>

          <div className="landing-nav-links">
            <a href="#skills">Skills</a>
            <a href="#ferramentas">Ferramentas</a>
            <a href="#comportamento">Comportamento</a>
            <a href="#pratica">Na prática</a>
            <a href="#faq">Perguntas</a>
          </div>

          <Link href="/mare" className="landing-button landing-button-primary">
            Conversar com a Mare <ArrowRight size={15} />
          </Link>
        </div>
      </nav>

      <main>
      <section className="landing-hero" data-enter>
        <div className="landing-hero-dither" aria-hidden="true">
          <DitherField
            pattern="landscape"
            color={['#dce9ff', '#87aeea', '#0553af']}
            dotSize={2}
            intensity={0.72}
            speed={0.6}
            fps={24}
            interactive
            className="h-full w-full"
          />
        </div>
        <div className="landing-container wrap landing-hero-grid">
          <div className="landing-hero-text">
            <h1>Agente de IA para pesquisar, planejar e escrever</h1>
            <p className="landing-hero-lead">
              A Mare lê o pedido, escolhe a skill e chama as ferramentas ligadas. Você vê o
              pensamento, as fontes e a resposta no mesmo lugar.
            </p>

            <div className="landing-hero-actions">
              <Link href="/mare" className="landing-button landing-button-primary">
                Conversar com a Mare <ArrowRight size={15} />
              </Link>
              <a href="#skills" className="landing-button landing-button-ghost">
                Ver as skills
              </a>
            </div>

            <dl className="landing-facts">
              <div>
                <dt>8</dt>
                <dd>skills na conversa</dd>
              </div>
              <div>
                <dt>2</dt>
                <dd>ferramentas ligáveis</dd>
              </div>
              <div>
                <dt>0</dt>
                <dd>instalação, é no navegador</dd>
              </div>
            </dl>
          </div>

          <div className="landing-appframe" aria-label="Conversa de exemplo com a Mare">
            <div className="landing-appframe-head">
              <MareAvatar size={30} />
              <strong>Mare</strong>
              <span className="landing-appframe-status">
                <i aria-hidden="true" /> aguardando comando
              </span>
            </div>
            <div className="landing-appframe-body">
              <div className="landing-appframe-dither" aria-hidden="true">
                <DitherField
                  pattern="waves"
                  color={['#e6efff', '#adc9f3', '#3b74c9']}
                  dotSize={2}
                  intensity={0.4}
                  speed={0.35}
                  fps={20}
                  interactive
                  className="h-full w-full"
                />
              </div>
              <MessageBubble role="user" meta="09:12">
                /planejar Preciso organizar a semana sem deixar nada importante escapar.
              </MessageBubble>
              <MessageBubble role="assistant" meta="09:12">
                <div className="landing-chat-text">
                  Separei três frentes: o que precisa de decisão, o que pode avançar sozinho e o
                  que só exige acompanhamento. O primeiro passo é escolher a decisão que destrava
                  as outras duas. Quer que eu monte o passo a passo?
                </div>
              </MessageBubble>
            </div>
            <div className="landing-appframe-foot">
              <span className="landing-appframe-input">Peça algo, use / para skills</span>
              <span className="landing-appframe-send" aria-hidden="true">
                <ArrowUp size={16} />
              </span>
              <AnimatedPetSprite
                sheet="chat"
                row={1}
                frames={6}
                fps={6}
                height={64}
                label="Mare andando devagar enquanto gera a resposta"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="skills">
        <div className="landing-container wrap">
          <div className="landing-section-head">
            <h2>Skills com comando de barra</h2>
            <p>Digite / no campo de mensagem. A Mare mostra a skill certa para o momento.</p>
          </div>

          <div className="landing-cards landing-cards-skills">
            {skills.map(({ icon: Icon, title, text }) => (
              <article className="landing-card" key={title}>
                <span className="landing-card-icon">
                  <Icon size={19} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-alt" id="ferramentas">
        <div className="landing-container wrap landing-split">
          <div>
            <div className="landing-section-head">
              <h2>Ferramentas que você liga e desliga</h2>
              <p>
                A Mare mostra cada chamada, o pedido e a resposta. O caminho até a resposta fica
                aberto para você conferir.
              </p>
            </div>

            <div className="landing-tool-list">
              {tools.map(({ icon: Icon, title, text }) => (
                <article className="landing-card" key={title}>
                  <span className="landing-card-icon">
                    <Icon size={19} />
                  </span>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="landing-toolcall" aria-label="Chamada de ferramenta de exemplo">
            <div className="landing-toolcall-head">
              <Search size={15} />
              <strong>web_search</strong>
              <span>concluída</span>
            </div>
            <dl>
              <div>
                <dt>Pedido</dt>
                <dd>horário de funcionamento de bibliotecas no centro</dd>
              </div>
              <div>
                <dt>Resposta</dt>
                <dd>6 fontes encontradas, com endereço e resumo</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="landing-section" id="comportamento">
        <div className="landing-container wrap">
          <div className="landing-section-head">
            <h2>A Mare mostra o que está fazendo</h2>
            <p>
              Cada gesto ao lado do chat diz a fase da resposta. Maçã e água entram só quando ela
              está parada.
            </p>
          </div>

          <div className="landing-behaviours">
            <article className="landing-behaviour">
              <WatchMare />
              <div>
                <h3>Olha para o mouse</h3>
                <p>Parada, a Mare acompanha o cursor nas oito direções da folha 1×8.</p>
              </div>
            </article>

            <article className="landing-behaviour">
              <ChatCycleMare />
              <div>
                <h3>Ações do chat</h3>
                <p>Gerando, ela olha, anda, pasta, corre e deita conforme o progresso.</p>
              </div>
            </article>

            <article className="landing-behaviour">
              <OutrosCycleMare />
              <div>
                <h3>Espera sem notícia</h3>
                <p>Sem evento novo, entra a folha de espera: pasta, duvida, deita e dorme.</p>
              </div>
            </article>

            <article className="landing-behaviour">
              <div className="landing-mare-stage landing-mare-stage-feed">
                <AnimatedPetSprite sheet="eat" row={0} frames={8} fps={6} height={104} label="Mare comendo maçã" />
                <AnimatedPetSprite sheet="drink" row={0} frames={8} fps={6} height={104} label="Mare bebendo água" />
              </div>
              <div>
                <h3>Come e bebe</h3>
                <p>Arraste a maçã ou a água até a Mare. Durante a geração, nada acontece.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-alt" id="pratica">
        <div className="landing-container wrap landing-split">
          <div>
            <div className="landing-section-head">
              <h2>Uma conversa que termina com trabalho feito</h2>
              <p>Peça o que precisa em linguagem natural ou comece com uma skill.</p>
            </div>

            <ol className="landing-steps">
              {steps.map((step, index) => (
                <li key={step.title}>
                  <span aria-hidden="true">{index + 1}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="landing-chat" aria-label="Exemplo de conversa">
            <MessageBubble role="user" meta="09:12">
              /pesquisar O que mudou nas regras de teletrabalho?
            </MessageBubble>
            <MessageBubble role="assistant" meta="09:12">
              <div className="landing-chat-text">
                <Search size={13} style={{ verticalAlign: -2, marginRight: 6 }} />
                Busquei nas fontes recentes e resumi o que mudou, com o que ainda está em aberto.
                Quer o quadro de prós e contras?
              </div>
            </MessageBubble>
            <MessageBubble role="user" meta="09:13">
              Quero. E deixa em passos curtos.
            </MessageBubble>
            <MessageBubble role="assistant" meta="09:13">
              <div className="landing-chat-text">
                <FileText size={13} style={{ verticalAlign: -2, marginRight: 6 }} />
                Quadro em cinco linhas, com a fonte de cada ponto na lista abaixo da mensagem.
              </div>
            </MessageBubble>
          </div>
        </div>
      </section>

      <section className="landing-section" id="faq">
        <div className="landing-container wrap landing-split">
          <div>
          <div className="landing-section-head">
            <h2>Perguntas sobre a Mare</h2>
          </div>

          <div className="landing-faq">
            {faq.map((item) => (
              <details key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
          </div>
          <div className="landing-faq-visual">
            <WatchMare height={220} />
          </div>
        </div>
      </section>

      <section className="landing-final">
        <div className="landing-container wrap landing-split">
          <div>
            <h2>Comece a conversa com a Mare</h2>
            <p>Escreva o que precisa em uma frase. A Mare escolhe a skill e chama as ferramentas.</p>
            <div className="landing-hero-actions">
              <Link href="/mare" className="landing-button landing-button-primary">
                Conversar com a Mare <ArrowRight size={15} />
              </Link>
            </div>
          </div>
          <div className="landing-final-photo">
            <img src="/mare/opt/foto-perfil.png" alt="Mare" />
          </div>
        </div>
      </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container wrap landing-footer-inner">
          <span className="landing-footer-brand">
            <MareAvatar size={26} /> Agente Mare · {new Date().getFullYear()}
          </span>
          <span>
            <a href="#skills">Skills</a>
            <a href="#ferramentas">Ferramentas</a>
            <Link href="/mare">Conversar com a Mare</Link>
          </span>
          <span>Imagens e sprites: acervo do projeto Mare.</span>
        </div>
      </footer>
    </div>
  );
}
