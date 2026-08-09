import type { Preview } from '@storybook/react-vite';
import '../src/tokens.css';

const preview: Preview = {
  globalTypes: {
    theme: { description: 'Tema', defaultValue: 'light', toolbar: { items: ['light', 'dark'] } },
    density: { description: 'Densidade', defaultValue: 'default', toolbar: { items: ['default', 'compact'] } },
  },
  decorators: [(Story, context) => <div data-theme={context.globals.theme} data-density={context.globals.density} style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', minHeight: '100vh', padding: 24 }}><Story /></div>],
  parameters: { a11y: { test: 'error' }, controls: { expanded: true } },
};
export default preview;
