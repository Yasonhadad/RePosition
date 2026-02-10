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

  // Ensure DB schema exists (create tables) before bootstrap
  const shouldBootstrap = process.env.BOOTSTRAP_ON_START !== "false";
  if (shouldBootstrap && process.env.DATABASE_URL) {
    try {
      log("DataBootstrap: ensuring database schema (drizzle-kit push)...");
      const push = spawn(
        process.platform === "win32" ? "npx.cmd" : "npx",
        ["drizzle-kit", "push", "--force"],
        { cwd: process.cwd(), stdio: "inherit", env: process.env }
      );
      await new Promise<void>((resolve, reject) => {
        push.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`drizzle-kit push exited with ${code}`))));
        push.on("error", reject);
      });
      log("DataBootstrap: schema ready.");
    } catch (e: any) {
      log(`DataBootstrap: schema push failed: ${e?.message || e}`);
    }
  }

  if (shouldBootstrap) {
    try {
      log("DataBootstrap: starting initial data load (this may take a few minutes)...");
      const py = spawn(process.platform === "win32" ? "python" : "python3", [
        path.resolve(process.cwd(), "models", "data_loader.py"),
      ], { cwd: process.cwd(), stdio: "inherit", env: process.env });

      await new Promise<void>((resolve, reject) => {
        py.on("exit", (code) => {
          if (code === 0) {
            log("DataBootstrap: completed successfully.");
            resolve();
          } else {
            log(`DataBootstrap: finished with exit code ${code}`);
            resolve(); // still start server so app is usable
          }
        });
        py.on("error", (err) => {
          log(`DataBootstrap: failed to start: ${err.message}`);
          resolve(); // still start server
        });
      });
    } catch (e: any) {
      log(`DataBootstrap: unexpected error: ${e?.message || e}`);
    }
  } else {
    log("DataBootstrap: skipped (BOOTSTRAP_ON_START=false)");
  }

  // Start serving only after bootstrap has finished (when bootstrap ran)
  const port = 5000;
  const host = '0.0.0.0';
  server.listen(port, host, () => {
    log(`serving on port ${port}`);
    log(`Local access: http://localhost:${port}`);
    log(`Network access: http://${host}:${port}`);
  });
})();
