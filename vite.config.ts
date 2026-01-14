import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Vite config for building popup only (React app)
// Content script and service worker are built separately with esbuild
export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                popup: resolve(__dirname, 'src/popup/index.html'),
            },
            output: {
                entryFileNames: 'src/popup/assets/[name]-[hash].js',
                chunkFileNames: 'src/popup/assets/[name]-[hash].js',
                assetFileNames: 'src/popup/assets/[name]-[hash][extname]',
            },
        },
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
});
