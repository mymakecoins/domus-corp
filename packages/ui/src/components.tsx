import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Slot } from '@radix-ui/react-slot';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cva, type VariantProps } from 'class-variance-authority';
import { Activity, ChevronDown, ClockAlert, ExternalLink, GitCompareArrows, ShieldCheck, ShieldX, X } from 'lucide-react';
import React from 'react';

import { AI_SEMANTIC_STATES, assertButtonClassesAllowed, normalizeSelectOptions, type ActionReceiptPayload, type ActionRequestPayload, type AiSemanticState, type AiTone, type CitationItem, type EvidenceSource, type FreshnessStatus, type SelectOption } from './tokens.js';
import { cn } from './utils.js';

const buttonVariants = cva('domus-button', {
  variants: {
    variant: { default: 'bg-primary', secondary: 'bg-secondary', outline: 'bg-outline', ghost: 'bg-ghost', destructive: 'bg-destructive', link: 'bg-link' },
    size: { default: 'size-default', sm: 'size-sm', lg: 'size-lg', icon: 'size-icon' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

assertButtonClassesAllowed(buttonVariants());

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ asChild, className, variant, size, ...props }, ref) => {
  const Component = asChild ? Slot : 'button';
  const classes = buttonVariants({ variant, size, className });
  assertButtonClassesAllowed(classes);
  return <Component ref={ref} className={classes} {...props} />;
});
Button.displayName = 'Button';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> { tone?: AiTone | 'neutral' }
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(({ className, tone = 'neutral', ...props }, ref) => <span ref={ref} className={cn('domus-badge', `tone-${tone}`, className)} {...props} />);
Badge.displayName = 'Badge';

export const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => <div ref={ref} role="alert" className={cn('domus-alert', className)} {...props} />);
Alert.displayName = 'Alert';
export const AlertTitle = (props: React.HTMLAttributes<HTMLHeadingElement>) => <h3 className={cn('domus-alert-title', props.className)} {...props} />;
export const AlertDescription = (props: React.HTMLAttributes<HTMLDivElement>) => <div className={cn('domus-alert-description', props.className)} {...props} />;

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => <section ref={ref} className={cn('domus-card', className)} {...props} />);
Card.displayName = 'Card';
export const CardHeader = (props: React.HTMLAttributes<HTMLDivElement>) => <header className={cn('domus-card-header', props.className)} {...props} />;
export const CardTitle = (props: React.HTMLAttributes<HTMLHeadingElement>) => <h3 className={cn('domus-card-title', props.className)} {...props} />;
export const CardContent = (props: React.HTMLAttributes<HTMLDivElement>) => <div className={cn('domus-card-content', props.className)} {...props} />;

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
export const DialogClose = DialogPrimitive.Close;
export const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>>(({ className, children, ...props }, ref) => <DialogPrimitive.Portal><DialogPrimitive.Overlay className="domus-overlay" /><DialogPrimitive.Content ref={ref} className={cn('domus-dialog', className)} {...props}>{children}<DialogPrimitive.Close className="domus-dialog-close" aria-label="Fechar"><X aria-hidden="true" /></DialogPrimitive.Close></DialogPrimitive.Content></DialogPrimitive.Portal>);
DialogContent.displayName = 'DialogContent';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;
export const SheetContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>>(({ className, children, ...props }, ref) => <DialogPrimitive.Portal><DialogPrimitive.Overlay className="domus-overlay" /><DialogPrimitive.Content ref={ref} className={cn('domus-sheet', className)} {...props}>{children}<DialogPrimitive.Close className="domus-dialog-close" aria-label="Fechar"><X aria-hidden="true" /></DialogPrimitive.Close></DialogPrimitive.Content></DialogPrimitive.Portal>);
SheetContent.displayName = 'SheetContent';

export const Table = React.forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(({ className, ...props }, ref) => <div className="domus-table-scroll"><table ref={ref} className={cn('domus-table', className)} {...props} /></div>);
Table.displayName = 'Table';
export const TableHeader = (props: React.HTMLAttributes<HTMLTableSectionElement>) => <thead {...props} />;
export const TableBody = (props: React.HTMLAttributes<HTMLTableSectionElement>) => <tbody {...props} />;
export const TableRow = (props: React.HTMLAttributes<HTMLTableRowElement>) => <tr {...props} />;
export const TableHead = (props: React.ThHTMLAttributes<HTMLTableCellElement>) => <th scope="col" {...props} />;
export const TableCell = (props: React.TdHTMLAttributes<HTMLTableCellElement>) => <td {...props} />;

export const Tabs = TabsPrimitive.Root;
export const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(({ className, ...props }, ref) => <TabsPrimitive.List ref={ref} className={cn('domus-tabs-list', className)} {...props} />);
TabsList.displayName = 'TabsList';
export const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(({ className, ...props }, ref) => <TabsPrimitive.Trigger ref={ref} className={cn('domus-tabs-trigger', className)} {...props} />);
TabsTrigger.displayName = 'TabsTrigger';
export const TabsContent = TabsPrimitive.Content;

export const Command = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => <div ref={ref} role="search" className={cn('domus-command', className)} {...props} />);
Command.displayName = 'Command';
export const CommandInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => <input ref={ref} type="search" {...props} />);
CommandInput.displayName = 'CommandInput';
export const CommandList = React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>((props, ref) => <ul ref={ref} role="listbox" {...props} />);
CommandList.displayName = 'CommandList';
export const CommandItem = React.forwardRef<HTMLLIElement, React.LiHTMLAttributes<HTMLLIElement>>((props, ref) => <li ref={ref} role="option" {...props} />);
CommandItem.displayName = 'CommandItem';
export const CommandEmpty = (props: React.HTMLAttributes<HTMLParagraphElement>) => <p role="status" {...props} />;

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export const TooltipContent = React.forwardRef<React.ElementRef<typeof TooltipPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>>(({ className, sideOffset = 4, ...props }, ref) => <TooltipPrimitive.Portal><TooltipPrimitive.Content ref={ref} sideOffset={sideOffset} className={cn('domus-tooltip', className)} {...props} /></TooltipPrimitive.Portal>);
TooltipContent.displayName = 'TooltipContent';

export interface SelectProps extends SelectPrimitive.SelectProps { options: readonly SelectOption[]; placeholder?: string; order?: 'alphabetical' | 'explicit'; 'aria-label': string }
export function Select({ options, placeholder = 'Selecione', order, 'aria-label': ariaLabel, ...props }: SelectProps) {
  const normalized = normalizeSelectOptions(options, order);
  return <SelectPrimitive.Root {...props}><SelectPrimitive.Trigger className="domus-select-trigger" aria-label={ariaLabel}><SelectPrimitive.Value placeholder={placeholder} /><SelectPrimitive.Icon><ChevronDown aria-hidden="true" /></SelectPrimitive.Icon></SelectPrimitive.Trigger><SelectPrimitive.Portal><SelectPrimitive.Content className="domus-select-content"><SelectPrimitive.Viewport>{normalized.map((option) => <SelectPrimitive.Item className="domus-select-item" key={option.value} value={option.value} disabled={option.disabled}><SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText></SelectPrimitive.Item>)}</SelectPrimitive.Viewport></SelectPrimitive.Content></SelectPrimitive.Portal></SelectPrimitive.Root>;
}

export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div aria-hidden="true" className={cn('domus-skeleton', className)} {...props} />;

export function AiSemanticBadge({ state }: { state: AiSemanticState }) { const meta = AI_SEMANTIC_STATES[state]; const Icon = meta.icon; return <Badge tone={meta.tone} title={meta.description}><Icon aria-hidden="true" /><span>{meta.label}</span><span className="sr-only">. {meta.description}</span></Badge>; }

export interface CitationPillProps {
  refCode?: string;
  label?: string;
  status?: FreshnessStatus;
  children?: React.ReactNode;
  onClick?: () => void;
}

export function CitationPill({ refCode, label, status, children, onClick }: CitationPillProps) {
  const displayLabel = label ?? (typeof children === 'string' ? children : refCode ?? 'Citação');
  const accessibleText = `Ver evidência ${refCode ? `${refCode}: ` : ''}${displayLabel}`;
  return (
    <Button variant="link" onClick={onClick} aria-label={accessibleText} className="domus-citation-pill">
      <ExternalLink aria-hidden="true" />
      {refCode && <span className="citation-code">{refCode}</span>}
      <span>{displayLabel}</span>
      {status && status !== 'vigente' && <span className={`citation-dot dot-${status}`} aria-hidden="true" />}
    </Button>
  );
}

export function AiResponseCard({ state, children, citations }: { state: AiSemanticState; children: React.ReactNode; citations?: React.ReactNode }) { return <Card><CardHeader><AiSemanticBadge state={state} /></CardHeader><CardContent>{children}<div className="domus-actions">{citations}</div></CardContent></Card>; }

export interface EvidenceSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title?: string;
  citation?: CitationItem;
  onInspectSource?: (sourceId: string) => void;
  children?: React.ReactNode;
}

export function EvidenceSheet({ open, onOpenChange, trigger, title, citation, onInspectSource, children }: EvidenceSheetProps) {
  const contentTitle = title ?? (citation ? `${citation.refCode ?? ''} ${citation.label}`.trim() : 'Detalhes da evidência');
  const isRestricted = citation?.status === 'restrita' || citation?.primaryEvidence?.accessRestricted || citation?.primaryEvidence?.freshnessStatus === 'restrita';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="domus-evidence-sheet">
        <SheetTitle>{contentTitle}</SheetTitle>
        <SheetDescription>Inspeção de proveniência, versão e alçada de autorização.</SheetDescription>

        {isRestricted ? (
          <PolicyDecisionBanner decision="denied">
            Acesso Restrito: Os metadados e o trecho desta evidência requerem alçada de autorização superior. Conteúdo protegido por RLS/Policy.
          </PolicyDecisionBanner>
        ) : citation?.primaryEvidence ? (
          <div className="evidence-body">
            <header className="evidence-header">
              <SourceFreshnessBadge status={citation.status ?? citation.primaryEvidence.freshnessStatus} />
              {citation.primaryEvidence.classification && (
                <Badge tone="neutral">{citation.primaryEvidence.classification}</Badge>
              )}
            </header>

            {citation.status === 'conflitante' && citation.conflictingEvidences && citation.conflictingEvidences.length > 0 ? (
              <Tabs defaultValue="primary" className="evidence-tabs">
                <TabsList aria-label="Fontes em conflito">
                  <TabsTrigger value="primary">Fonte A (Principal)</TabsTrigger>
                  <TabsTrigger value="conflict">Fonte B (Divergente)</TabsTrigger>
                </TabsList>
                <TabsContent value="primary">
                  <EvidenceDetailCard evidence={citation.primaryEvidence} onInspectSource={onInspectSource} />
                </TabsContent>
                <TabsContent value="conflict">
                  <EvidenceDetailCard evidence={citation.conflictingEvidences[0]!} onInspectSource={onInspectSource} />
                </TabsContent>
              </Tabs>
            ) : (
              <EvidenceDetailCard evidence={citation.primaryEvidence} onInspectSource={onInspectSource} />
            )}
          </div>
        ) : (
          children
        )}
      </SheetContent>
    </Sheet>
  );
}

function EvidenceDetailCard({ evidence, onInspectSource }: { evidence: EvidenceSource; onInspectSource?: (id: string) => void }) {
  return (
    <Card className="evidence-detail-card">
      <CardHeader>
        <CardTitle>{evidence.documentTitle}</CardTitle>
        <p className="evidence-subtitle">
          Versão {evidence.versionId} • {evidence.sectionLocator}
        </p>
      </CardHeader>
      <CardContent>
        {evidence.excerpt && (
          <blockquote className="domus-excerpt" title="Trecho factual recuperado">
            "{evidence.excerpt}"
          </blockquote>
        )}
        <dl className="evidence-metadata">
          <div>
            <dt>Responsável (Owner):</dt>
            <dd>{evidence.owner ?? 'Não informado'}</dd>
          </div>
          {evidence.validityPeriod && (
            <div>
              <dt>Vigência:</dt>
              <dd>
                {evidence.validityPeriod.start ?? 'N/A'} até {evidence.validityPeriod.end ?? 'N/A'}
              </dd>
            </div>
          )}
        </dl>
        {onInspectSource && (
          <Button variant="outline" size="sm" onClick={() => onInspectSource(evidence.id)}>
            <ExternalLink aria-hidden="true" />
            Inspecionar no Knowledge Fabric
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export interface SourceFreshnessBadgeProps {
  status?: FreshnessStatus;
  stale?: boolean;
}

export function SourceFreshnessBadge({ status, stale }: SourceFreshnessBadgeProps) {
  const resolvedStatus: FreshnessStatus = status ?? (stale ? 'obsoleta' : 'vigente');
  if (resolvedStatus === 'obsoleta') {
    return <Badge tone="warning"><ClockAlert aria-hidden="true" /><span>Revisão necessária</span></Badge>;
  }
  if (resolvedStatus === 'conflitante') {
    return <Badge tone="warning"><GitCompareArrows aria-hidden="true" /><span>Fontes divergentes</span></Badge>;
  }
  if (resolvedStatus === 'restrita') {
    return <Badge tone="error"><ShieldX aria-hidden="true" /><span>Acesso restrito</span></Badge>;
  }
  return <Badge tone="success"><ShieldCheck aria-hidden="true" /><span>Fonte vigente</span></Badge>;
}
export interface ActionReviewDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title?: string;
  actionRequest: ActionRequestPayload;
  onConfirm: (confirmToken?: string) => Promise<ActionReceiptPayload> | ActionReceiptPayload;
  onClose?: () => void;
  className?: string;
}

export function ActionReviewDialog({
  open,
  onOpenChange,
  trigger,
  title = 'Revisar ação',
  actionRequest,
  onConfirm,
  onClose,
  className,
}: ActionReviewDialogProps) {
  const [receipt, setReceipt] = React.useState<ActionReceiptPayload | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open === false) {
      setReceipt(null);
      setError(null);
      setIsLoading(false);
    }
  }, [open]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      onClose?.();
      setReceipt(null);
      setError(null);
      setIsLoading(false);
    }
    onOpenChange?.(newOpen);
  };

  const handleConfirm = async (confirmToken?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await onConfirm(confirmToken);
      setReceipt(res);
    } catch (err: any) {
      setError(err?.message || 'Ocorreu um erro ao executar a ação.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskTone = (level: ActionRequestPayload['riskLevel']): AiTone | 'neutral' => {
    if (level === 'CRITICAL' || level === 'HIGH') return 'error';
    if (level === 'MEDIUM') return 'warning';
    return 'neutral';
  };

  const isBlocked = actionRequest.policyDecision === 'denied' || actionRequest.policyDecision === 'blocked';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={cn('domus-action-review-dialog', className)}>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          Confirme intenção, destino, parâmetros e impacto antes de executar.
        </DialogDescription>

        {receipt ? (
          <div className="domus-action-review-receipt space-y-4 my-4">
            <ActionReceiptView receipt={receipt} />
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  handleOpenChange(false);
                }}
              >
                Concluir e Fechar
              </Button>
            </div>
          </div>
        ) : (
          <div className="domus-action-review-body space-y-4 my-2">
            <PolicyDecisionBanner decision={actionRequest.policyDecision}>
              {actionRequest.policyReason}
            </PolicyDecisionBanner>

            <div className="domus-action-review-grid grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-muted block">Intenção:</span>
                <span>{actionRequest.intent}</span>
              </div>
              <div>
                <span className="font-medium text-muted block">Sistema Destino:</span>
                <span>{actionRequest.targetSystem}</span>
              </div>
              <div>
                <span className="font-medium text-muted block">Nível de Risco:</span>
                <Badge tone={getRiskTone(actionRequest.riskLevel)}>
                  {actionRequest.riskLevel}
                </Badge>
              </div>
              {actionRequest.requiredApproval && (
                <div>
                  <span className="font-medium text-muted block">Aprovação Exigida:</span>
                  <span>{actionRequest.requiredApproval}</span>
                </div>
              )}
            </div>

            {actionRequest.affectedScope && actionRequest.affectedScope.length > 0 && (
              <div className="domus-action-review-scope text-sm">
                <span className="font-medium text-muted block mb-1">Escopo Afetado:</span>
                <ul className="list-disc list-inside space-y-1">
                  {actionRequest.affectedScope.map((scope, index) => (
                    <li key={index}>{scope}</li>
                  ))}
                </ul>
              </div>
            )}

            {actionRequest.redactedParams && Object.keys(actionRequest.redactedParams).length > 0 && (
              <div className="domus-action-review-params text-sm">
                <span className="font-medium text-muted block mb-1">Parâmetros Redigidos:</span>
                <pre className="font-mono text-xs bg-muted/10 p-2 rounded border overflow-x-auto">
                  {JSON.stringify(actionRequest.redactedParams, null, 2)}
                </pre>
              </div>
            )}

            {actionRequest.budgetUsage && (
              <div className="domus-action-review-budget">
                <BudgetMeter
                  used={actionRequest.budgetUsage.used}
                  limit={actionRequest.budgetUsage.limit}
                />
              </div>
            )}

            {error && (
              <Alert role="alert" className="border-destructive text-destructive">
                <AlertTitle>Erro ao executar ação</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!isBlocked && (
              <ActionConfirmationGate
                riskLevel={actionRequest.riskLevel}
                isDestructive={actionRequest.isDestructive}
                isLoading={isLoading}
                onConfirm={handleConfirm}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


export interface ActionConfirmationGateProps {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isDestructive?: boolean;
  confirmationTerm?: string;
  onConfirm: (confirmToken?: string) => void;
  isLoading?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function ActionConfirmationGate({
  riskLevel,
  isDestructive = false,
  confirmationTerm = 'CONFIRMAR',
  onConfirm,
  isLoading = false,
  children,
  className,
}: ActionConfirmationGateProps) {
  const [isChecked, setIsChecked] = React.useState(false);
  const [typedTerm, setTypedTerm] = React.useState('');

  const expectedTerm = confirmationTerm.trim();
  const isTermMatching = typedTerm.trim().toLowerCase() === expectedTerm.toLowerCase();

  let canExecute = true;
  if (riskLevel === 'HIGH') {
    canExecute = isChecked;
  } else if (riskLevel === 'CRITICAL') {
    canExecute = isTermMatching;
  }

  const isButtonDisabled = isLoading || !canExecute;
  const buttonVariant = isDestructive ? 'destructive' : 'default';

  const handleButtonClick = () => {
    onConfirm(riskLevel === 'CRITICAL' ? typedTerm : undefined);
  };

  return (
    <div className={cn('domus-action-confirmation-gate', className)}>
      {children}

      {riskLevel === 'HIGH' && (
        <div className="domus-gate-field my-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              disabled={isLoading}
              className="domus-checkbox"
            />
            <span>Estou ciente e me responsabilizo pela execução desta ação de alto risco.</span>
          </label>
        </div>
      )}

      {riskLevel === 'CRITICAL' && (
        <div className="domus-gate-field my-3 space-y-1">
          <label htmlFor="gate-critical-term-input" className="block text-sm font-medium">
            Digite <strong className="font-mono">{expectedTerm}</strong> para confirmar a execução:
          </label>
          <input
            id="gate-critical-term-input"
            type="text"
            value={typedTerm}
            onChange={(e) => setTypedTerm(e.target.value)}
            placeholder={expectedTerm}
            disabled={isLoading}
            className="domus-input w-full p-2 border rounded text-sm"
          />
        </div>
      )}

      <div className="domus-gate-actions mt-4 flex justify-end">
        <Button
          variant={buttonVariant}
          disabled={isButtonDisabled}
          onClick={handleButtonClick}
        >
          {isLoading ? 'Executando...' : 'Confirmar e Executar'}
        </Button>
      </div>
    </div>
  );
}

const receiptStatusToneMap: Record<ActionReceiptPayload['status'], AiTone> = {
  SUCCESS: 'success',
  FAILED: 'error',
  KILLED: 'error',
  INCONCLUSIVE: 'warning',
};

const receiptStatusLabelMap: Record<ActionReceiptPayload['status'], string> = {
  SUCCESS: 'Sucesso',
  FAILED: 'Falha',
  KILLED: 'Interrompido',
  INCONCLUSIVE: 'Inconclusivo',
};

export interface ActionReceiptViewProps {
  receipt: ActionReceiptPayload;
  className?: string;
}

export function ActionReceiptView({ receipt, className }: ActionReceiptViewProps) {
  const statusTone = receiptStatusToneMap[receipt.status] ?? 'neutral';
  const statusLabel = receiptStatusLabelMap[receipt.status] ?? receipt.status;

  return (
    <Card className={cn('domus-action-receipt-view', className)}>
      <CardHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone={statusTone}>{statusLabel}</Badge>
          <AiSemanticBadge state={receipt.semanticState} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="domus-receipt-summary font-semibold text-base">{receipt.summary}</p>
        
        <dl className="domus-receipt-details grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="font-medium text-muted">ID do Recibo:</dt>
            <dd className="font-mono text-xs break-all">{receipt.receiptId}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted">ID de Correlação:</dt>
            <dd className="font-mono text-xs break-all">{receipt.correlationId}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted">Executado em:</dt>
            <dd className="text-xs">{receipt.executedAt}</dd>
          </div>
        </dl>

        {receipt.auditUrl && (
          <div className="domus-receipt-audit pt-2">
            <a
              href={receipt.auditUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="domus-link inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <ExternalLink aria-hidden="true" className="w-4 h-4" />
              <span>Ver Trilha de Auditoria</span>
            </a>
          </div>
        )}

        {receipt.nextAction && (
          <div className="domus-receipt-next-action pt-2 flex justify-end">
            <Button variant="outline" size="sm" onClick={receipt.nextAction.onClick}>
              {receipt.nextAction.label}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export interface PolicyDecisionBannerProps {
  decision: 'allowed' | 'denied' | 'conditioned' | 'blocked';
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PolicyDecisionBanner({ decision, title, children, className }: PolicyDecisionBannerProps) {
  const isBlocked = decision === 'denied' || decision === 'blocked';
  const isConditioned = decision === 'conditioned';
  
  const Icon = isBlocked ? ShieldX : isConditioned ? ClockAlert : ShieldCheck;
  const defaultTitle = isBlocked ? 'Operação bloqueada' : isConditioned ? 'Operação condicionada' : 'Operação permitida';
  const displayTitle = title ?? defaultTitle;

  return (
    <Alert className={cn('domus-policy-banner', isBlocked && 'banner-blocked', isConditioned && 'banner-conditioned', className)}>
      <Icon aria-hidden="true" />
      <AlertTitle>{displayTitle}</AlertTitle>
      {children && <AlertDescription>{children}</AlertDescription>}
    </Alert>
  );
}

export interface BudgetMeterProps {
  used: number;
  limit: number;
  label?: string;
  className?: string;
}

export function BudgetMeter({ used, limit, label = 'Consumo do orçamento', className }: BudgetMeterProps) {
  const safeLimit = Math.max(0, limit);
  const ratio = safeLimit === 0 ? (used > 0 ? 1 : 0) : used / safeLimit;
  const percentage = Math.min(100, Math.max(0, Math.round(ratio * 100)));
  const isWarning = ratio >= 0.8;

  return (
    <div className={cn('domus-meter', isWarning && 'meter-warning', className)}>
      <label className="domus-meter-label block text-sm font-medium mb-1">{label}</label>
      <div className="domus-meter-bar flex items-center gap-2">
        <progress value={percentage} max={100} className="w-full">
          {percentage}%
        </progress>
        <span className="domus-meter-value text-sm font-mono whitespace-nowrap">
          {used} de {limit} ({percentage}%)
        </span>
      </div>
    </div>
  );
}

export function InsightCard({ title, state, children }: { title: string; state: AiSemanticState; children: React.ReactNode }) { return <Card><CardHeader><CardTitle>{title}</CardTitle><AiSemanticBadge state={state} /></CardHeader><CardContent>{children}</CardContent></Card>; }
export function KnowledgeAssetRow({ name, owner, status }: { name: string; owner: string; status: React.ReactNode }) { return <TableRow><TableCell>{name}</TableCell><TableCell>{owner}</TableCell><TableCell>{status}</TableCell></TableRow>; }
export function StreamingIndicator({ label = 'Gerando resposta' }: { label?: string }) { return <div role="status" aria-live="polite" className="domus-streaming"><Activity aria-hidden="true" /><span>{label}</span></div>; }
export function EmptyStateWithNextAction({ title, description, action }: { title: string; description: string; action: React.ReactNode }) { return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent><p>{description}</p>{action}</CardContent></Card>; }

export type InformationType = 'fact' | 'inference' | 'recommendation';

export function SeparationBadge({ type }: { type: InformationType }) {
  const config = {
    fact: { label: 'Dado Observado (Fato)', tone: 'info' as const },
    inference: { label: 'Interpretação (Inferência)', tone: 'warning' as const },
    recommendation: { label: 'Ação Sugerida (Recomendação)', tone: 'success' as const },
  }[type];

  return <Badge tone={config.tone}>{config.label}</Badge>;
}

export interface ExecutiveBriefingCardProps {
  title: string;
  role: string;
  timeWindow: string;
  summary: string;
  changesCount: number;
  gapsCount: number;
  insightsCount: number;
  onExpand?: () => void;
}

export function ExecutiveBriefingCard({
  title,
  role,
  timeWindow,
  summary,
  changesCount,
  gapsCount,
  insightsCount,
  onExpand,
}: ExecutiveBriefingCardProps) {
  return (
    <Card className="executive-briefing-card">
      <CardHeader>
        <div className="briefing-meta">
          <Badge tone="neutral">{role}</Badge>
          <Badge tone="neutral">Janela: {timeWindow}</Badge>
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="briefing-summary">{summary}</p>
        <div className="briefing-counters">
          <span className="counter-tag">{changesCount} mudanças</span>
          <span className="counter-tag">{gapsCount} gaps</span>
          <span className="counter-tag">{insightsCount} insights</span>
        </div>
        {onExpand && (
          <Button variant="outline" size="sm" onClick={onExpand}>
            Visualizar Briefing Completo
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export { buttonVariants };

