import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Domus Button contract.
 * Indigo (#271BAE) and Violet (#310AE3) are intentionally absent from every
 * interactive background and hover state.
 */
export const domusButtonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md',
    'text-sm font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm hover:bg-[hsl(var(--primary-hover))]',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-[hsl(var(--secondary-hover))]',
        outline:
          'border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
        ghost:
          'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-[hsl(var(--state-error-strong))]',
        link: 'bg-transparent text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type DomusButtonVariantProps = VariantProps<typeof domusButtonVariants>;

export function domusButtonClassName(
  props?: DomusButtonVariantProps & { className?: string },
) {
  return cn(domusButtonVariants(props), props?.className);
}
