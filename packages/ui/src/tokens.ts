import type { LucideIcon } from 'lucide-react';
import {
  CircleAlert,
  CircleDashed,
  ClockAlert,
  FileQuestion,
  GitCompareArrows,
  ShieldCheck,
  ShieldX,
  Sparkles,
} from 'lucide-react';

export type AiSemanticState =
  | 'fundamentada'
  | 'parcial'
  | 'conflitante'
  | 'inferida'
  | 'sem-evidencia'
  | 'obsoleta'
  | 'bloqueada'
  | 'inconclusiva';

export type AiTone = 'success' | 'warning' | 'info' | 'muted' | 'error';

export type FreshnessStatus = 'vigente' | 'obsoleta' | 'conflitante' | 'restrita';

export interface ActionReceiptPayload {
  receiptId: string;
  correlationId: string;
  status: 'SUCCESS' | 'FAILED' | 'INCONCLUSIVE' | 'KILLED';
  semanticState: AiSemanticState;
  executedAt: string;
  summary: string;
  auditUrl?: string;
  nextAction?: { id: string; label: string; onClick?: () => void };
}

export interface EvidenceSource {
  id: string;
  documentTitle: string;
  versionId: string;
  sectionLocator: string;
  excerpt?: string;
  owner?: string;
  validityPeriod?: { start?: string; end?: string };
  freshnessStatus: FreshnessStatus;
  classification?: string;
  accessRestricted?: boolean;
}

export interface CitationItem {
  id: string;
  refCode: string;
  label: string;
  status?: FreshnessStatus;
  primaryEvidence?: EvidenceSource;
  conflictingEvidences?: EvidenceSource[];
}

export interface AiSemanticStateMetadata {
  label: string;
  description: string;
  icon: LucideIcon;
  tone: AiTone;
  nextAction: { id: string; label: string };
}

export const AI_SEMANTIC_STATES: Record<AiSemanticState, AiSemanticStateMetadata> = {
  fundamentada: { label: 'Fundamentada', description: 'A resposta possui evidência vigente e autorizada no Knowledge Fabric.', icon: ShieldCheck, tone: 'success', nextAction: { id: 'inspect-source', label: 'Inspecionar fonte' } },
  parcial: { label: 'Parcial', description: 'A resposta tem evidência parcial e contém lacunas explicitadas.', icon: CircleAlert, tone: 'warning', nextAction: { id: 'review-gaps', label: 'Revisar lacunas' } },
  conflitante: { label: 'Conflitante', description: 'Existem fontes autorizadas com orientações divergentes.', icon: GitCompareArrows, tone: 'warning', nextAction: { id: 'consult-owners', label: 'Consultar owners' } },
  inferida: { label: 'Inferida', description: 'O conteúdo é uma interpretação do modelo, não uma regra oficial.', icon: Sparkles, tone: 'info', nextAction: { id: 'view-assumptions', label: 'Ver premissas' } },
  'sem-evidencia': { label: 'Sem evidência', description: 'Não foi encontrada fonte autorizada suficiente para responder.', icon: FileQuestion, tone: 'muted', nextAction: { id: 'open-gap', label: 'Abrir gap ou refinar busca' } },
  obsoleta: { label: 'Obsoleta', description: 'A fonte está fora da vigência ou do SLA de frescor.', icon: ClockAlert, tone: 'warning', nextAction: { id: 'review-source', label: 'Revisar fonte' } },
  bloqueada: { label: 'Bloqueada', description: 'A operação foi impedida por policy, budget, escopo ou segurança.', icon: ShieldX, tone: 'error', nextAction: { id: 'consult-policy', label: 'Consultar policy/admin' } },
  inconclusiva: { label: 'Inconclusiva', description: 'O sistema não conseguiu confirmar o resultado com segurança.', icon: CircleDashed, tone: 'muted', nextAction: { id: 'investigate', label: 'Repetir ou investigar' } },
};

const FORBIDDEN_BUTTON_STYLES = [
  '#271bae', '#310ae3', 'bg-indigo', 'bg-violet', 'brand-depth', 'brand-secondary',
] as const;

export function assertButtonClassesAllowed(classes: string): void {
  const normalized = classes.toLowerCase();
  const forbidden = FORBIDDEN_BUTTON_STYLES.find((value) => normalized.includes(value));
  if (forbidden) throw new Error(`Button contém estilo proibido: ${forbidden}`);
}

export interface SelectOption { value: string; label: string; disabled?: boolean }

export function normalizeSelectOptions(
  options: readonly SelectOption[],
  order: 'alphabetical' | 'explicit' = 'alphabetical',
): SelectOption[] {
  if (options.some(({ value }) => value.trim().length === 0)) {
    throw new Error('Select.Item exige value não vazio');
  }
  const copy = [...options];
  return order === 'alphabetical'
    ? copy.sort((left, right) => left.label.localeCompare(right.label, 'pt-BR'))
    : copy;
}

export const DOMUS_DENSITIES = {
  default: { tableRowHeight: '3rem', cellPaddingY: '0.75rem' },
  compact: { tableRowHeight: '2.25rem', cellPaddingY: '0.5rem' },
} as const;
