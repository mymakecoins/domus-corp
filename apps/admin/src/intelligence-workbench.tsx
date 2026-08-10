import {
  AiSemanticBadge,
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EvidenceSheet,
  ExecutiveBriefingCard,
  Select,
  SeparationBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type CitationItem,
} from '@domus/ui';
import React from 'react';
import type {
  ChangeImpactItem,
  ExecutiveBriefingItem,
  IntelligenceClient,
  IntelligenceInsightItem,
  KnowledgeGapItem,
} from './intelligence-client.js';
import type { WorkbenchSession } from './knowledge-workbench.js';

export function IntelligenceWorkbench({ session, client }: { session: WorkbenchSession; client: IntelligenceClient }) {
  const [insights, setInsights] = React.useState<readonly IntelligenceInsightItem[]>([]);
  const [briefings, setBriefings] = React.useState<readonly ExecutiveBriefingItem[]>([]);
  const [gaps, setGaps] = React.useState<readonly KnowledgeGapItem[]>([]);
  const [changes, setChanges] = React.useState<readonly ChangeImpactItem[]>([]);
  const [density, setDensity] = React.useState<'default' | 'compact'>('default');
  const [severityFilter, setSeverityFilter] = React.useState<string>('ALL');
  const [activeCitation, setActiveCitation] = React.useState<CitationItem | null>(null);
  const [mutedNonCritical, setMutedNonCritical] = React.useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = React.useState<string>();

  const refresh = React.useCallback(() => {
    void client.listInsights().then(setInsights);
    void client.listBriefings().then(setBriefings);
    void client.listGaps().then(setGaps);
    void client.listChanges().then(setChanges);
  }, [client]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  if (session.state !== 'AUTHENTICATED') {
    return (
      <main className="intelligence-workbench-shell">
        <Alert>
          <AlertTitle>Intelligence Workbench indisponível</AlertTitle>
          <AlertDescription>{session.reason} Conecte-se com sua identidade corporativa autorizada.</AlertDescription>
        </Alert>
      </main>
    );
  }

  const filteredInsights = insights.filter((item) => {
    if (severityFilter !== 'ALL' && item.severity !== severityFilter) return false;
    return true;
  });

  const severityOptions = [
    { value: 'ALL', label: 'Todas as severidades' },
    { value: 'alta', label: 'Alta severidade' },
    { value: 'media', label: 'Média severidade' },
    { value: 'baixa', label: 'Baixa severidade' },
  ];

  const densityOptions = [
    { value: 'default', label: 'Densidade Padrão (default)' },
    { value: 'compact', label: 'Densidade Compacta (compact)' },
  ];

  const handleGenerateBriefing = async () => {
    const item = await client.generateBriefing('Diretoria Executiva');
    setBriefings((prev) => [item, ...prev]);
    setFeedbackMessage('Novo briefing executivo gerado sob demanda.');
  };

  const handleReviewInsight = async (id: string, status: string) => {
    await client.reviewInsight(id, status);
    setFeedbackMessage(`Insight ${id} atualizado para o estado: ${status}.`);
    refresh();
  };

  const handleFeedback = async (id: string, feedbackType: string) => {
    await client.submitInsightFeedback(id, feedbackType);
    setFeedbackMessage(`Feedback (${feedbackType}) registrado para o insight ${id}.`);
  };

  return (
    <main className={`intelligence-workbench-shell density-${density}`}>
      <header className="workbench-header">
        <div>
          <p className="eyebrow">Plataforma Domus Corp — E5 Intelligence Plane</p>
          <h1>Intelligence Workbench</h1>
          <p>Visão executiva e operacional para gestores. Escopo do workspace: {session.workspaceName}</p>
        </div>
        <div className="header-controls">
          <Select
            options={densityOptions}
            value={density}
            onValueChange={(val) => setDensity(val as 'default' | 'compact')}
            aria-label="Selecionar densidade de exibição"
          />
        </div>
      </header>

      {feedbackMessage && (
        <Alert className="mb-4">
          <AlertTitle>Notificação do Sistema</AlertTitle>
          <AlertDescription>{feedbackMessage}</AlertDescription>
        </Alert>
      )}

      {/* Mandatory Security Banner */}
      <Alert className="mb-4 security-banner">
        <AlertTitle>Alerta Obrigatório de Segurança e RLS</AlertTitle>
        <AlertDescription>
          Todas as informações exibidas derivam do contexto estritamente autorizado pela EffectivePolicy. Alertas de RLS e budget não são ocultados pelas preferências de silenciamento.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="insights" className="workbench-tabs">
        <TabsList aria-label="Seções do Intelligence Workbench">
          <TabsTrigger value="insights">Insights Operacionais ({filteredInsights.length})</TabsTrigger>
          <TabsTrigger value="briefings">Briefings Executivos ({briefings.length})</TabsTrigger>
          <TabsTrigger value="gaps-changes">Gaps & Mudanças ({gaps.length + changes.length})</TabsTrigger>
          <TabsTrigger value="settings">Notificações & Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="insights">
          <div className="tab-actions mb-4">
            <Select
              options={severityOptions}
              value={severityFilter}
              onValueChange={setSeverityFilter}
              aria-label="Filtrar por severidade de impacto"
            />
          </div>
          <div className="insights-grid">
            {filteredInsights.map((item) => (
              <Card key={item.id} className="insight-card-item">
                <CardHeader>
                  <div className="card-header-top">
                    <AiSemanticBadge state={item.state} />
                    <Badge tone={item.severity === 'alta' ? 'error' : item.severity === 'media' ? 'warning' : 'info'}>
                      Impacto: {item.severity}
                    </Badge>
                    <Badge tone="neutral">Confiança: {item.confidence}</Badge>
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="tripartite-block">
                    <div className="tripartite-row">
                      <SeparationBadge type="fact" />
                      <p>{item.tripartite.fact}</p>
                    </div>
                    <div className="tripartite-row">
                      <SeparationBadge type="inference" />
                      <p>{item.tripartite.inference}</p>
                    </div>
                    <div className="tripartite-row">
                      <SeparationBadge type="recommendation" />
                      <p>{item.tripartite.recommendation}</p>
                    </div>
                  </div>
                  <dl className="insight-meta">
                    <div>
                      <dt>Fonte Original:</dt>
                      <dd>{item.sourceTitle} ({item.versionId})</dd>
                    </div>
                    <div>
                      <dt>Owner:</dt>
                      <dd>{item.owner}</dd>
                    </div>
                  </dl>
                  <div className="insight-actions">
                    {item.citation && (
                      <Button variant="outline" size="sm" onClick={() => setActiveCitation(item.citation!)}>
                        Inspecionar Evidência
                      </Button>
                    )}
                    <Button variant="default" size="sm" onClick={() => handleReviewInsight(item.id, 'reviewed')}>
                      Aprovar Publicação
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleFeedback(item.id, 'HELPFUL')}>
                      Útil 👍
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleFeedback(item.id, 'FALSE_POSITIVE')}>
                      Falso Positivo 👎
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="briefings">
          <div className="tab-actions mb-4">
            <Button variant="default" onClick={handleGenerateBriefing}>
              Gerar Briefing sob Demanda
            </Button>
          </div>
          <div className="briefings-grid">
            {briefings.map((briefing) => (
              <ExecutiveBriefingCard
                key={briefing.id}
                title={briefing.title}
                role={briefing.role}
                timeWindow={briefing.timeWindow}
                summary={briefing.summary}
                changesCount={briefing.changesCount}
                gapsCount={briefing.gapsCount}
                insightsCount={briefing.insightsCount}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="gaps-changes">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Lacunas de Conhecimento Detectadas (Knowledge Gaps)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Padrão de Consulta sem Evidência</TableHead>
                    <TableHead>Frequência</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gaps.map((gap) => (
                    <TableRow key={gap.id}>
                      <TableCell>{gap.queryPattern}</TableCell>
                      <TableCell>{gap.frequency}x</TableCell>
                      <TableCell>
                        <Badge tone={gap.status === 'OPEN' ? 'warning' : 'success'}>{gap.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mudanças e Obsolescência Detectadas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fonte</TableHead>
                    <TableHead>Resumo da Alteração</TableHead>
                    <TableHead>Impacto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {changes.map((chg) => (
                    <TableRow key={chg.id}>
                      <TableCell>{chg.sourceId}</TableCell>
                      <TableCell>{chg.summary}</TableCell>
                      <TableCell>
                        <Badge tone={chg.impactLevel === 'CRITICAL' ? 'error' : 'warning'}>{chg.impactLevel}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Notificações e Silenciamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="setting-row">
                <label htmlFor="mute-toggle">Silenciar notificações operacionais não críticas:</label>
                <input
                  id="mute-toggle"
                  type="checkbox"
                  checked={mutedNonCritical}
                  onChange={(e) => {
                    setMutedNonCritical(e.target.checked);
                    setFeedbackMessage(
                      e.target.checked
                        ? 'Notificações não críticas foram silenciadas.'
                        : 'Notificações não críticas foram reativadas.'
                    );
                  }}
                />
              </div>
              <p className="setting-note mt-2">
                Aviso: Alertas obrigatórios de RLS, violação de política ou exaustão de orçamento não são afetados.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
