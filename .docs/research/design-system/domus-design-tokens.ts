export const domusColors = {
  brand: {
    primary: '#0468F7',
    accent: '#02A4FC',
    depth: '#271BAE',
    secondary: '#310AE3',
  },
  neutral: {
    ink: '#111827',
    graphite: '#272A31',
    slate: '#5B6472',
    cloud: '#F6F8FC',
    white: '#FFFFFF',
    deepNight: '#191C24',
    midnight: '#0B1020',
  },
  state: {
    success: '#19C37D',
    successSoft: '#DCFCE7',
    warning: '#F5A524',
    warningSoft: '#FEF3C7',
    error: '#EF4444',
    errorSoft: '#FEE2E2',
    info: '#3B82F6',
    infoSoft: '#DBEAFE',
  },
  support: {
    mintTech: '#2DD4BF',
    skyTech: '#38BDF8',
    lilacSoft: '#A855F7',
    electricViolet: '#6D28D9',
  },
} as const;

export const domusButtonBackgrounds = {
  primary: 'var(--primary)',
  secondary: 'var(--secondary)',
  outline: 'transparent',
  ghost: 'transparent',
  destructive: 'var(--destructive)',
} as const;

/**
 * Indigo and Violet remain brand/depth tokens, but are never valid Button backgrounds.
 * This guard is intended for development-time checks and component tests.
 */
export const forbiddenButtonColors = new Set([
  domusColors.brand.depth,
  domusColors.brand.secondary,
  'hsl(var(--brand-depth))',
  'hsl(var(--brand-secondary))',
  'bg-indigo',
  'bg-violet',
]);

export function assertButtonColorAllowed(value: string): void {
  const normalized = value.toLowerCase();
  const forbidden = [...forbiddenButtonColors].some((token) =>
    normalized.includes(token.toLowerCase()),
  );

  if (forbidden) {
    throw new Error(
      `Domus design-system: Indigo/Violet não pode ser usado como background de Button: ${value}`,
    );
  }
}

export type AiSemanticState =
  | 'fundamentada'
  | 'parcial'
  | 'conflitante'
  | 'inferida'
  | 'sem-evidencia'
  | 'obsoleta'
  | 'bloqueada'
  | 'inconclusiva';

export type AiProcessingState =
  | 'processando'
  | 'streaming'
  | 'concluida'
  | 'cancelada'
  | 'falha';

export const aiSemanticStateMeta: Record<
  AiSemanticState,
  {
    label: string;
    description: string;
    icon: string;
    tone: 'success' | 'warning' | 'info' | 'muted' | 'error';
    action: 'none' | 'review-source' | 'review-owner' | 'retry' | 'contact-admin';
  }
> = {
  fundamentada: {
    label: 'Fundamentada',
    description: 'A resposta possui evidência vigente e autorizada no Knowledge Fabric.',
    icon: 'ShieldCheck',
    tone: 'success',
    action: 'none',
  },
  parcial: {
    label: 'Parcial',
    description: 'A resposta tem evidência parcial e contém lacunas explicitadas.',
    icon: 'CircleAlert',
    tone: 'warning',
    action: 'review-source',
  },
  conflitante: {
    label: 'Conflitante',
    description: 'Existem fontes autorizadas com orientações divergentes.',
    icon: 'GitCompareArrows',
    tone: 'warning',
    action: 'review-owner',
  },
  inferida: {
    label: 'Inferida',
    description: 'O conteúdo é uma interpretação do modelo, não uma regra oficial.',
    icon: 'Sparkles',
    tone: 'info',
    action: 'review-source',
  },
  'sem-evidencia': {
    label: 'Sem evidência',
    description: 'Não foi encontrada fonte autorizada suficiente para responder.',
    icon: 'FileQuestion',
    tone: 'muted',
    action: 'review-source',
  },
  obsoleta: {
    label: 'Obsoleta',
    description: 'A fonte está fora da vigência ou do SLA de frescor.',
    icon: 'ClockAlert',
    tone: 'warning',
    action: 'review-owner',
  },
  bloqueada: {
    label: 'Bloqueada',
    description: 'A operação foi impedida por policy, budget, escopo ou segurança.',
    icon: 'ShieldX',
    tone: 'error',
    action: 'contact-admin',
  },
  inconclusiva: {
    label: 'Inconclusiva',
    description: 'O sistema não conseguiu confirmar o resultado com segurança.',
    icon: 'CircleDashed',
    tone: 'muted',
    action: 'retry',
  },
};

export const aiProcessingStateMeta: Record<
  AiProcessingState,
  { label: string; icon: string; tone: 'processing' | 'success' | 'muted' | 'error' }
> = {
  processando: { label: 'Processando', icon: 'LoaderCircle', tone: 'processing' },
  streaming: { label: 'Gerando resposta', icon: 'Activity', tone: 'processing' },
  concluida: { label: 'Concluída', icon: 'CheckCircle2', tone: 'success' },
  cancelada: { label: 'Cancelada', icon: 'Ban', tone: 'muted' },
  falha: { label: 'Falha', icon: 'CircleX', tone: 'error' },
};

export const domusDensity = {
  default: {
    rowHeight: '3rem',
    cellPaddingX: '0.75rem',
    cellPaddingY: '0.75rem',
    bodyText: 'text-sm',
  },
  compact: {
    rowHeight: '2.25rem',
    cellPaddingX: '0.75rem',
    cellPaddingY: '0.5rem',
    bodyText: 'text-xs',
  },
} as const;
