import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const YAHOO_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/fx': {
        target: 'https://api.frankfurter.dev',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/fx/, '/v1'),
      },
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Yahoo가 모바일·브라우저 UA가 아니면 쿠키 폭탄을 던집니다.
            proxyReq.setHeader('User-Agent', YAHOO_UA);
            proxyReq.setHeader('Accept', 'application/json');
            proxyReq.setHeader('Accept-Language', 'en-US,en;q=0.9');
            // 우리는 응답 본문만 필요 — 쿠키 헤더는 통째로 버려 Node 헤더 한도 초과 방지
            proxyReq.removeHeader('cookie');
          });
          proxy.on('proxyRes', (proxyRes) => {
            delete proxyRes.headers['set-cookie'];
          });
          proxy.on('error', (err, _req, res) => {
            console.warn('[yahoo proxy]', err.message);
            if (res && 'writeHead' in res && !res.headersSent) {
              try {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'yahoo_proxy_error', message: err.message }));
              } catch {
                /* noop */
              }
            }
          });
        },
      },
    },
  },
});
