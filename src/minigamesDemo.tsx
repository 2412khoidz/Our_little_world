import { createRoot } from 'react-dom/client';
import { MinigameDemo } from './features/minigames/MinigameDemo';
import './styles/theme.css';
import './features/minigames/minigames.css';

/**
 * Dev-only entry for `minigames.html`.
 *
 * This page is intentionally excluded from the production build: `vite.config.ts`
 * does not declare `build.rollupOptions.input`, so Vite builds only the default
 * `index.html` entry. Nothing here is referenced by `src/main.tsx`, which keeps
 * the hot-seat demo out of the shipped app bundle.
 *
 * Open it with the dev server: http://localhost:5173/minigames.html
 */
const container = document.getElementById('root');
if (container === null) {
  throw new Error('Thiếu phần tử #root cho trang mini-game.');
}
createRoot(container).render(<MinigameDemo />);
