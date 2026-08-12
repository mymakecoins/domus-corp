import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { assertButtonClassesAllowed, buttonVariants } from '../src/index.js';

describe('Color Guard — Guardrail de Cores em Buttons', () => {
  it('permite classes válidas de botão sem Indigo ou Violeta', () => {
    expect(() => assertButtonClassesAllowed('domus-button bg-primary text-white')).not.toThrow();
    expect(() => assertButtonClassesAllowed('domus-button bg-secondary text-foreground')).not.toThrow();
    expect(() => assertButtonClassesAllowed('domus-button bg-destructive text-white')).not.toThrow();
  });

  it('rejeita hexadecimais proibidos (#271BAE e #310AE3) em botões', () => {
    expect(() => assertButtonClassesAllowed('color: #271bae')).toThrow(/estilo proibido/i);
    expect(() => assertButtonClassesAllowed('color: #310AE3')).toThrow(/estilo proibido/i);
  });

  it('rejeita tokens legados (brand-depth e brand-secondary) em botões', () => {
    expect(() => assertButtonClassesAllowed('bg-brand-depth')).toThrow(/estilo proibido/i);
    expect(() => assertButtonClassesAllowed('text-brand-secondary')).toThrow(/estilo proibido/i);
  });

  it('rejeita classes utilitárias de Indigo (background, texto, borda, hover, focus)', () => {
    expect(() => assertButtonClassesAllowed('bg-indigo-600')).toThrow(/estilo proibido/i);
    expect(() => assertButtonClassesAllowed('text-indigo-500')).toThrow(/estilo proibido/i);
    expect(() => assertButtonClassesAllowed('border-indigo-400')).toThrow(/estilo proibido/i);
    expect(() => assertButtonClassesAllowed('hover:bg-indigo-700')).toThrow(/estilo proibido/i);
    expect(() => assertButtonClassesAllowed('focus:ring-indigo-500')).toThrow(/estilo proibido/i);
  });

  it('rejeita classes utilitárias de Violeta (background, texto, borda, hover, focus)', () => {
    expect(() => assertButtonClassesAllowed('bg-violet-600')).toThrow(/estilo proibido/i);
    expect(() => assertButtonClassesAllowed('text-violet-500')).toThrow(/estilo proibido/i);
    expect(() => assertButtonClassesAllowed('border-violet-400')).toThrow(/estilo proibido/i);
    expect(() => assertButtonClassesAllowed('hover:bg-violet-700')).toThrow(/estilo proibido/i);
    expect(() => assertButtonClassesAllowed('focus:ring-violet-500')).toThrow(/estilo proibido/i);
  });

  it('garante que nenhuma variante padrão de buttonVariants gera Indigo ou Violeta', () => {
    const variants = ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const;
    const sizes = ['default', 'sm', 'lg', 'icon'] as const;

    for (const variant of variants) {
      for (const size of sizes) {
        const classes = buttonVariants({ variant, size });
        expect(() => assertButtonClassesAllowed(classes)).not.toThrow();
      }
    }
  });

  it('inspeciona o arquivo tokens.css garantindo que regras de botão não contêm Indigo/Violeta', () => {
    const cssPath = path.resolve(__dirname, '../src/tokens.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    // Procura seções de .domus-button no CSS
    const buttonBlockRegex = /\.domus-button[^{]*\{[^}]*\}/gi;
    const buttonBlocks = cssContent.match(buttonBlockRegex) || [];

    for (const block of buttonBlocks) {
      const lower = block.toLowerCase();
      expect(lower).not.toContain('indigo');
      expect(lower).not.toContain('violet');
      expect(lower).not.toContain('#271bae');
      expect(lower).not.toContain('#310ae3');
    }
  });
});
