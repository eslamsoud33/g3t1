import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  base: '/elkinz/', // تم التعديل ليتطابق مع مجلد ومستودع الكنز الجديد
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'motion'],
        },
      },
    },
  },
});