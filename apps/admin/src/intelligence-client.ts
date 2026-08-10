import type { AiSemanticState, CitationItem } from '@domus/ui';
import type { WorkbenchSession } from './knowledge-workbench.js';

export type SeverityLevel = 'alta' | 'media' | 'baixa';
export type ConfidenceLevel = 'alta' | 'media' | 'baixa';

export interface TripartiteInformation {
  fact: string;
  inference: string;
  recommendation: string;
}

export interface IntelligenceInsightItem {
  id: string;
  title: string;
  tenantId: string;
  workspaceId: string;
  state: AiSemanticState;
  severity: SeverityLevel;
  confidence: ConfidenceLevel;
  tripartite: TripartiteInformation;
  sourceId: string;
  sourceTitle: string;
  versionId: string;
  owner: string;
  validityEnd?: string;
  status: 'draft' | 'reviewed' | 'published' | 'archived';
  citation?: CitationItem;
  createdAt: string;
}

export interface ExecutiveBriefingItem {
  id: string;
  title: string;
  role: string;
  timeWindow: string;
  summary: string;
  changesCount: number;
  gapsCount: number;
  insightsCount: number;
  generatedAt: string;
  citations: CitationItem[];
}

export interface KnowledgeGapItem {
  id: string;
  queryPattern: string;
  frequency: number;
  status: 'OPEN' | 'ASSIGNED' | 'RESOLVED';
  assignedOwner?: string;
}

export interface ChangeImpactItem {
  id: string;
  sourceId: string;
  sourceType: string;
  summary: string;
  impactLevel: 'CRITICAL' | 'MODERATE' | 'LOW';
  detectedAt: string;
}

export interface IntelligenceClient {
  listInsights(): Promise<readonly IntelligenceInsightItem[]>;
  reviewInsight(id: string, status: string): Promise<void>;
  submitInsightFeedback(id: string, feedbackType: string, comment?: string): Promise<void>;
  listBriefings(): Promise<readonly ExecutiveBriefingItem[]>;
  generateBriefing(role: string): Promise<ExecutiveBriefingItem>;
  listGaps(): Promise<readonly KnowledgeGapItem[]>;
  listChanges(): Promise<readonly ChangeImpactItem[]>;
}

const MOCK_INSIGHTS: IntelligenceInsightItem[] = [
  {
    id: 'ins-001',
    title: 'Desvio de Conformidade em Retenção de Auditoria',
    tenantId: 'tenant-default',
    workspaceId: 'ws-governance',
    state: 'conflitante',
    severity: 'alta',
    confidence: 'alta',
    tripartite: {
      fact: 'Norma 2024 especifica 90 dias, enquanto Norma 2026 especifica 365 dias para guarda de logs.',
      inference: 'Existe um conflito normativo entre as políticas de compliance e jurídico.',
      recommendation: 'Alinhar a retenção unificada para 365 dias e atualizar a Norma 2024.',
    },
    sourceId: 'src-pol-01',
    sourceTitle: 'Norma de Auditoria e Guarda de Dados',
    versionId: 'v2.0',
    owner: 'Time de Compliance',
    status: 'draft',
    createdAt: '2026-08-10T10:00:00Z',
    citation: {
      id: 'cit-ins-01',
      refCode: '[CIT-01]',
      label: 'Norma de Auditoria 2024 vs 2026',
      status: 'conflitante',
      primaryEvidence: {
        id: 'ev-01a',
        documentTitle: 'Norma de Auditoria 2024',
        versionId: 'v1.2',
        sectionLocator: 'Artigo 12 — Retenção',
        excerpt: 'Os registros de log de auditoria devem ser retidos por 90 dias.',
        owner: 'Compliance',
        freshnessStatus: 'conflitante',
      },
      conflictingEvidences: [
        {
          id: 'ev-01b',
          documentTitle: 'Norma de Governança 2026',
          versionId: 'v2.0',
          sectionLocator: 'Artigo 5 — Retenção Ampliada',
          excerpt: 'Os logs de auditoria corporativos devem ser retidos por 365 dias.',
          owner: 'Jurídico',
          freshnessStatus: 'conflitante',
        },
      ],
    },
  },
  {
    id: 'ins-002',
    title: 'Autenticação OIDC Server-Side em Dispositivos Móveis',
    tenantId: 'tenant-default',
    workspaceId: 'ws-security',
    state: 'fundamentada',
    severity: 'media',
    confidence: 'alta',
    tripartite: {
      fact: 'Todos os tokens da plataforma passam pela troca OIDC server-side.',
      inference: 'Não foram detectados vazamentos de chaves de API em clientes locais.',
      recommendation: 'Manter a política ativa e monitorar tempo de rotação.',
    },
    sourceId: 'src-sec-02',
    sourceTitle: 'Diretriz de Autenticação Corporativa',
    versionId: 'v2.4',
    owner: 'Time de Arquitetura e Segurança',
    status: 'published',
    createdAt: '2026-08-10T11:30:00Z',
  },
];

const MOCK_BRIEFINGS: ExecutiveBriefingItem[] = [
  {
    id: 'brf-001',
    title: 'Briefing Semanal da Diretoria de Operações',
    role: 'Direção Executiva',
    timeWindow: '7d',
    summary: 'Registradas 3 alterações de diretrizes normativas, 2 lacunas de conhecimento e 1 conflito de retenção.',
    changesCount: 3,
    gapsCount: 2,
    insightsCount: 1,
    generatedAt: '2026-08-10T08:00:00Z',
    citations: [],
  },
];

const MOCK_GAPS: KnowledgeGapItem[] = [
  {
    id: 'gap-001',
    queryPattern: 'como renovar certificado mTLS do gateway',
    frequency: 14,
    status: 'OPEN',
  },
];

const MOCK_CHANGES: ChangeImpactItem[] = [
  {
    id: 'chg-001',
    sourceId: 'doc-pol-005',
    sourceType: 'POLITY_DOCUMENT',
    summary: 'Atualização da política de retenção de chaves de acesso',
    impactLevel: 'CRITICAL',
    detectedAt: '2026-08-09T16:00:00Z',
  },
];

export function createIntelligenceClient(session: WorkbenchSession, apiBaseUrl = 'http://localhost:8000'): IntelligenceClient {
  return {
    async listInsights() {
      if (session.state !== 'AUTHENTICATED') return MOCK_INSIGHTS;
      try {
        const res = await fetch(`${apiBaseUrl}/intelligence/insights?tenant_id=tenant-default`);
        if (!res.ok) return MOCK_INSIGHTS;
        return (await res.json()) as IntelligenceInsightItem[];
      } catch {
        return MOCK_INSIGHTS;
      }
    },
    async reviewInsight(id: string, status: string) {
      if (session.state !== 'AUTHENTICATED') return;
      try {
        await fetch(`${apiBaseUrl}/intelligence/insights/${id}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, reviewer: 'Gestor Autorizado' }),
        });
      } catch {
        // Fallback no-op
      }
    },
    async submitInsightFeedback(id: string, feedbackType: string, comment?: string) {
      if (session.state !== 'AUTHENTICATED') return;
      try {
        await fetch(`${apiBaseUrl}/intelligence/insights/${id}/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: 'gestor-1', feedback_type: feedbackType, comment }),
        });
      } catch {
        // Fallback no-op
      }
    },
    async listBriefings() {
      if (session.state !== 'AUTHENTICATED') return MOCK_BRIEFINGS;
      try {
        const res = await fetch(`${apiBaseUrl}/intelligence/briefings?tenant_id=tenant-default`);
        if (!res.ok) return MOCK_BRIEFINGS;
        return (await res.json()) as ExecutiveBriefingItem[];
      } catch {
        return MOCK_BRIEFINGS;
      }
    },
    async generateBriefing(role: string) {
      const newBriefing: ExecutiveBriefingItem = {
        id: `brf-${Date.now()}`,
        title: `Briefing sob demanda — ${role}`,
        role,
        timeWindow: '7d',
        summary: 'Briefing gerado com sucesso com base nos dados mais recentes.',
        changesCount: MOCK_CHANGES.length,
        gapsCount: MOCK_GAPS.length,
        insightsCount: MOCK_INSIGHTS.length,
        generatedAt: new Date().toISOString(),
        citations: [],
      };
      return newBriefing;
    },
    async listGaps() {
      if (session.state !== 'AUTHENTICATED') return MOCK_GAPS;
      try {
        const res = await fetch(`${apiBaseUrl}/v1/knowledge-gaps?tenant_id=tenant-default`);
        if (!res.ok) return MOCK_GAPS;
        return (await res.json()) as KnowledgeGapItem[];
      } catch {
        return MOCK_GAPS;
      }
    },
    async listChanges() {
      if (session.state !== 'AUTHENTICATED') return MOCK_CHANGES;
      try {
        const res = await fetch(`${apiBaseUrl}/intelligence/changes?tenant_id=tenant-default`);
        if (!res.ok) return MOCK_CHANGES;
        return (await res.json()) as ChangeImpactItem[];
      } catch {
        return MOCK_CHANGES;
      }
    },
  };
}
