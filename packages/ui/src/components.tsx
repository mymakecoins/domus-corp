import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Slot } from '@radix-ui/react-slot';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cva, type VariantProps } from 'class-variance-authority';
import { Activity, ChevronDown, ClockAlert, ExternalLink, GitCompareArrows, ShieldCheck, ShieldX, X } from 'lucide-react';
import React from 'react';

import { AI_SEMANTIC_STATES, assertButtonClassesAllowed, normalizeSelectOptions, type AiSemanticState, type AiTone, type CitationItem, type EvidenceSource, type FreshnessStatus, type SelectOption } from './tokens.js';
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
                  <EvidenceDetailCard evidence={citation.conflictingEvidences[0]} onInspectSource={onInspectSource} />
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
export function ActionReviewDialog({ trigger, title = 'Revisar ação', children, onConfirm }: { trigger: React.ReactNode; title?: string; children: React.ReactNode; onConfirm?: () => void }) { return <Dialog><DialogTrigger asChild>{trigger}</DialogTrigger><DialogContent><DialogTitle>{title}</DialogTitle><DialogDescription>Confirme intenção, destino, parâmetros e impacto antes de executar.</DialogDescription>{children}<Button onClick={onConfirm}>Confirmar ação</Button></DialogContent></Dialog>; }
export function PolicyDecisionBanner({ decision, children }: { decision: 'allowed' | 'denied' | 'conditioned' | 'blocked'; children: React.ReactNode }) { const blocked = decision === 'denied' || decision === 'blocked'; return <Alert><ShieldX aria-hidden="true" /><AlertTitle>{blocked ? 'Operação bloqueada' : decision === 'conditioned' ? 'Operação condicionada' : 'Operação permitida'}</AlertTitle><AlertDescription>{children}</AlertDescription></Alert>; }
export function BudgetMeter({ used, limit }: { used: number; limit: number }) { const safeLimit = Math.max(0, limit); const value = safeLimit === 0 ? 0 : Math.min(100, Math.max(0, used / safeLimit * 100)); return <div className="domus-meter"><label>Consumo do orçamento</label><progress value={value} max={100}>{value}%</progress><span>{used} de {limit}</span></div>; }
export function InsightCard({ title, state, children }: { title: string; state: AiSemanticState; children: React.ReactNode }) { return <Card><CardHeader><CardTitle>{title}</CardTitle><AiSemanticBadge state={state} /></CardHeader><CardContent>{children}</CardContent></Card>; }
export function KnowledgeAssetRow({ name, owner, status }: { name: string; owner: string; status: React.ReactNode }) { return <TableRow><TableCell>{name}</TableCell><TableCell>{owner}</TableCell><TableCell>{status}</TableCell></TableRow>; }
export function StreamingIndicator({ label = 'Gerando resposta' }: { label?: string }) { return <div role="status" aria-live="polite" className="domus-streaming"><Activity aria-hidden="true" /><span>{label}</span></div>; }
export function EmptyStateWithNextAction({ title, description, action }: { title: string; description: string; action: React.ReactNode }) { return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent><p>{description}</p>{action}</CardContent></Card>; }

export { buttonVariants };
