import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the built app works when served from a subfolder too.
export default defineConfig({
  base: './',
  plugins: [react()],
});
