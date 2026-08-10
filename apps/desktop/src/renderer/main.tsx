import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AiResponseCard,
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  CitationPill,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EvidenceSheet,
  StreamingIndicator,
  type AiSemanticState,
  type CitationItem,
} from '@domus/ui';
import '@domus/ui/tokens.css';
import './app.css';

type StreamEvent = {
  type: 'started' | 'delta' | 'completed' | 'cancelled' | 'failed';
  text?: string;
  code?: string;
  semantic_state?: AiSemanticState;
  citation_refs?: string[];
};

type Phase =
  | 'IDLE'
  | 'SUBMITTING'
  | 'STREAMING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED'
  | 'INCONCLUSIVE'
  | 'BLOCKED';

const bridge = (
  window as unknown as Window & {
    domus: {
      chat: {
        start(value: unknown): Promise<unknown>;
        cancel(): Promise<unknown>;
        onEvent(listener: (event: StreamEvent) => void): () => void;
        history: { list(value: unknown): Promise<unknown[]> };
      };
    };
  }
).domus.chat;

const SYNTHETIC_EVIDENCE_MAP: Record<string, CitationItem> = {
  '[1]': {
    id: 'cit-1',
    refCode: '[1]',
    label: 'Política de Segurança e Controle de Acesso',
    status: 'vigente',
    primaryEvidence: {
      id: 'ev-pol-sec-01',
      documentTitle: 'Política de Segurança da Informação v2.4',
      versionId: 'v2.4',
      sectionLocator: 'Seção 4.1 — Identidade e Acesso',
      excerpt: 'Todo usuário da plataforma Domus Corp deve utilizar autenticação OIDC corporativa com tokens rotacionados server-side.',
      owner: 'Time de Arquitetura e Segurança',
      validityPeriod: { start: '2026-01-01', end: '2026-12-31' },
      freshnessStatus: 'vigente',
      classification: 'INTERNO',
    },
  },
  '[2]': {
    id: 'cit-2',
    refCode: '[2]',
    label: 'Manual de Procedimentos Operacionais',
    status: 'obsoleta',
    primaryEvidence: {
      id: 'ev-man-obs-04',
      documentTitle: 'Manual de Operações v1.0',
      versionId: 'v1.0',
      sectionLocator: 'Capítulo 2 — Chaves locais',
      excerpt: 'Chaves de API podem ser configuradas em variáveis locais no ambiente do usuário.',
      owner: 'Suporte Técnico',
      validityPeriod: { start: '2024-01-01', end: '2025-12-31' },
      freshnessStatus: 'obsoleta',
      classification: 'OBSOLETO',
    },
  },
  '[3]': {
    id: 'cit-3',
    refCode: '[3]',
    label: 'Diretriz de Retenção e Auditoria',
    status: 'conflitante',
    primaryEvidence: {
      id: 'ev-reg-conf-01a',
      documentTitle: 'Norma de Auditoria 2024',
      versionId: 'v1.2',
      sectionLocator: 'Artigo 12 — Retenção',
      excerpt: 'Os registros de log de auditoria devem ser retidos por no máximo 90 dias no banco local.',
      owner: 'Compliance',
      freshnessStatus: 'conflitante',
    },
    conflictingEvidences: [
      {
        id: 'ev-reg-conf-01b',
        documentTitle: 'Norma de Governança 2026',
        versionId: 'v2.0',
        sectionLocator: 'Artigo 5 — Retenção Ampliada',
        excerpt: 'Os logs de auditoria corporativos devem ser retidos por 365 dias para atendimento regulatório.',
        owner: 'Jurídico',
        freshnessStatus: 'conflitante',
      },
    ],
  },
  '[4]': {
    id: 'cit-4',
    refCode: '[4]',
    label: 'Relatório Financeiro Restrito',
    status: 'restrita',
    primaryEvidence: {
      id: 'ev-fin-res-99',
      documentTitle: 'Relatório Secreto de FinOps',
      versionId: 'v1.0',
      sectionLocator: 'Seção Sigilosa',
      excerpt: 'DADOS SENSÍVEIS FORA DE ALÇADA',
      owner: 'FinOps',
      freshnessStatus: 'restrita',
      accessRestricted: true,
    },
  },
};

function App() {
  const [question, setQuestion] = useState('');
  const [phase, setPhase] = useState<Phase>('IDLE');
  const [answer, setAnswer] = useState('');
  const [semantic, setSemantic] = useState<AiSemanticState>();
  const [citations, setCitations] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<unknown[]>([]);
  const [activeCitation, setActiveCitation] = useState<CitationItem | null>(null);

  useEffect(() =>
    bridge.onEvent((event) => {
      if (event.type === 'started') setPhase('STREAMING');
      else if (event.type === 'delta') {
        setPhase('STREAMING');
        setAnswer((value) => value + (event.text ?? ''));
      } else if (event.type === 'completed') {
        setPhase('COMPLETED');
        setSemantic(event.semantic_state);
        setCitations(event.citation_refs ?? []);
      } else if (event.type === 'cancelled') setPhase('CANCELLED');
      else {
        setPhase(event.code === 'POLICY_DENIED' || event.code === 'BUDGET_DENIED' ? 'BLOCKED' : 'FAILED');
        setError(technicalMessage(event.code));
      }
    }), []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const content = question.trim();
    if (!content || phase === 'SUBMITTING' || phase === 'STREAMING') return;
    setAnswer('');
    setSemantic(undefined);
    setCitations([]);
    setError('');
    setPhase('SUBMITTING');
    try {
      await bridge.start({ messages: [{ role: 'user', content }], maximumOutputTokens: 1024 });
    } catch (value) {
      const message = String(value);
      setPhase(message.includes('SESSION') ? 'BLOCKED' : message.includes('INTERRUPTED') ? 'INCONCLUSIVE' : 'FAILED');
      setError(
        message.includes('SESSION')
          ? 'Entre com sua identidade corporativa para iniciar o chat.'
          : 'Não foi possível concluir a resposta com segurança.',
      );
    }
  };

  const cancel = async () => {
    try {
      await bridge.cancel();
    } catch {
      setPhase('INCONCLUSIVE');
      setError('O estado final não pôde ser confirmado.');
    }
  };

  const loadHistory = async () => {
    const to = new Date(),
      from = new Date(to.getTime() - 90 * 86_400_000);
    try {
      setHistory(await bridge.history.list({ from: from.toISOString(), to: to.toISOString(), limit: 100 }));
    } catch {
      setError('O histórico local não está disponível para esta sessão.');
    }
  };

  const active = phase === 'SUBMITTING' || phase === 'STREAMING';

  const handleCitationClick = (ref: string) => {
    const citation = SYNTHETIC_EVIDENCE_MAP[ref] ?? {
      id: ref,
      refCode: ref,
      label: `Evidência ${ref}`,
      status: 'vigente',
      primaryEvidence: {
        id: `ev-${ref}`,
        documentTitle: `Documento ${ref}`,
        versionId: 'v1.0',
        sectionLocator: 'Seção Geral',
        excerpt: 'Conteúdo citado na resposta da IA.',
        owner: 'Base Corporativa',
        freshnessStatus: 'vigente',
      },
    };
    setActiveCitation(citation);
  };

  return (
    <main className="chat-shell" aria-labelledby="chat-title">
      <header>
        <p className="eyebrow">Domus Corp</p>
        <h1 id="chat-title">Chat corporativo</h1>
        <p>Respostas operam dentro do workspace, policy e budget verificados pelo servidor.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Nova pergunta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit}>
            <label htmlFor="question">O que você precisa saber?</label>
            <textarea
              id="question"
              value={question}
              maxLength={65536}
              onChange={(event) => setQuestion(event.target.value)}
              disabled={active}
            />
            <div className="actions">
              <Button type="submit" disabled={active || !question.trim()}>
                Enviar pergunta
              </Button>
              {active && (
                <Button type="button" variant="outline" onClick={cancel}>
                  Cancelar
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={loadHistory}>
                Carregar histórico local
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <p className="sr-only" role="status" aria-live="polite">
        {phaseLabel(phase)}
      </p>
      {active && <StreamingIndicator label={phase === 'SUBMITTING' ? 'Validando solicitação' : 'Gerando resposta'} />}
      {answer && (
        <AiResponseCard
          state={semantic ?? (phase === 'INCONCLUSIVE' ? 'inconclusiva' : 'inferida')}
          citations={citations.map((reference) => {
            const item = SYNTHETIC_EVIDENCE_MAP[reference];
            return (
              <CitationPill
                key={reference}
                refCode={reference}
                label={item?.label}
                status={item?.status}
                onClick={() => handleCitationClick(reference)}
              />
            );
          })}
        >
          <p className={phase === 'COMPLETED' ? '' : 'partial-response'}>{answer}</p>
          {phase !== 'COMPLETED' && <p>Resposta parcial — não use como resultado confirmado.</p>}
        </AiResponseCard>
      )}
      {error && (
        <Alert>
          <AlertTitle>
            {phase === 'BLOCKED' ? 'Operação bloqueada' : phase === 'INCONCLUSIVE' ? 'Resultado inconclusivo' : 'Falha técnica'}
          </AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico local permitido</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{history.length} item(ns) cifrado(s) neste dispositivo.</p>
          </CardContent>
        </Card>
      )}

      {activeCitation && (
        <EvidenceSheet
          open={!!activeCitation}
          citation={activeCitation}
          onOpenChange={(open) => {
            if (!open) setActiveCitation(null);
          }}
        />
      )}
    </main>
  );
}

function technicalMessage(code?: string) {
  if (code === 'PROVIDER_TIMEOUT') return 'O provedor excedeu o tempo limite. Tente novamente explicitamente.';
  if (code === 'STREAM_LIMIT_EXCEEDED') return 'A resposta excedeu o limite seguro.';
  return 'A dependência de IA falhou. Nenhuma resposta foi presumida.';
}

function phaseLabel(phase: Phase) {
  return ({
    IDLE: 'Pronto para uma pergunta',
    SUBMITTING: 'Validando solicitação',
    STREAMING: 'Gerando resposta',
    COMPLETED: 'Resposta concluída',
    CANCELLED: 'Resposta cancelada',
    FAILED: 'Falha técnica',
    INCONCLUSIVE: 'Resultado inconclusivo',
    BLOCKED: 'Operação bloqueada',
  } as const)[phase];
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
