import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { spawn } from "child_process";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve public folder for static assets (images, etc.)
app.use('/public', express.static(path.resolve(process.cwd(), 'public')));


app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Data bootstrap: run the full data load + compatibility calc on server start
  // Rename of the job: "DataBootstrap" (independent of the script file name)
  const shouldBootstrap = process.env.BOOTSTRAP_ON_START !== "false";
  if (shouldBootstrap) {
    try {
      log("DataBootstrap: starting initial data load (this may take a few minutes)...");
      const py = spawn(process.platform === "win32" ? "python" : "python3", [
        path.resolve(process.cwd(), "models", "data_loader.py"),
      ], { cwd: process.cwd(), stdio: "inherit" });

      py.on("exit", (code) => {
        if (code === 0) {
          log("DataBootstrap: completed successfully.");
        } else {
          log(`DataBootstrap: finished with exit code ${code}`);
        }
      });
      py.on("error", (err) => {
        log(`DataBootstrap: failed to start: ${err.message}`);
      });
    } catch (e: any) {
      log(`DataBootstrap: unexpected error: ${e?.message || e}`);
    }
  } else {
    log("DataBootstrap: skipped (BOOTSTRAP_ON_START=false)");
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  const host = '0.0.0.0';
  server.listen(port, host, () => {
    log(`serving on port ${port}`);
    log(`Local access: http://localhost:${port}`);
    log(`Network access: http://${host}:${port}`);
  });
})();
