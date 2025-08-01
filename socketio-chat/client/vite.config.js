import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  build: {
    outDir: 'dist'   
  },
  server: {
    host: true,
    proxy: {
      // Development proxy (for local testing)
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true
      }
    }
  },
  // Production environment configuration
  define: {
    'process.env': {
      VITE_API_URL: process.env.NODE_ENV === 'production' 
        ? JSON.stringify('https://plp-mern-wk-7-socketio-chat-render.onrender.com') 
        : JSON.stringify('http://localhost:5000')
    }
  }
});