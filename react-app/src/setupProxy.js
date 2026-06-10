// Dev-only: forward /api/* from the CRA dev server (port 3000) to the AI Assist
// proxy (port 8787). CRA auto-loads this file when present. This is more
// reliable than the package.json "proxy" string, which doesn't forward
// requests with an Accept: text/html header.
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.AI_PROXY_TARGET || 'http://localhost:8787',
      changeOrigin: true,
    })
  );
};
