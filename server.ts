import express from "express";
import { createServer as createViteServer } from "vite";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Proxy endpoint for MCP to bypass CORS
  app.use("/api/mcp-proxy", (req, res, next) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: "Missing 'url' query parameter" });
    }

    try {
      const target = new URL(targetUrl);
      
      // Create a dynamic proxy middleware for this specific target
      const proxy = createProxyMiddleware({
        target: target.origin,
        changeOrigin: true,
        pathRewrite: () => target.pathname + target.search,
        ws: true, // Support WebSockets if needed
        onProxyReq: (proxyReq, req, res) => {
          // The client will send the Authorization header, which will be forwarded
          // We can also inject it here if we wanted, but the client already sends it
        },
        onError: (err, req, res) => {
          console.error("Proxy error:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: "Proxy error", details: err.message });
          }
        }
      });

      // Execute the proxy middleware
      proxy(req, res, next);
    } catch (err: any) {
      res.status(400).json({ error: "Invalid target URL", details: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
