import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ML Backend process
let mlBackendProcess: any = null;

// Function to start ML backend
function startMLBackend() {
  log("Starting Python ML Backend...");
  
  const mlBackendPath = path.join(__dirname, '..', 'ml_backend', 'app.py');
  
  mlBackendProcess = spawn('python', [mlBackendPath], {
    stdio: 'pipe',
    cwd: process.cwd()
  });
  
  mlBackendProcess.stdout.on('data', (data: Buffer) => {
    const output = data.toString();
    if (output.includes('Running on http://127.0.0.1:5003')) {
      log("Python ML Backend started successfully on port 5003");
    } else if (output.includes('ML model loaded successfully')) {
      log("ML models loaded successfully");
    }
  });
  
  mlBackendProcess.stderr.on('data', (data: Buffer) => {
    const error = data.toString();
    if (!error.includes('WARNING: This is a development server')) {
      log(`ML Backend warning: ${error.trim()}`);
    }
  });
  
  mlBackendProcess.on('error', (error: Error) => {
    log(`Failed to start ML Backend: ${error.message}`);
  });
  
  mlBackendProcess.on('close', (code: number) => {
    if (code !== 0) {
      log(`ML Backend process exited with code ${code}`);
    }
  });
  
  // Wait a bit for ML backend to start
  setTimeout(() => {
    log("Checking ML Backend health...");
    checkMLBackendHealth();
  }, 3000);
}

// Function to check ML backend health
async function checkMLBackendHealth() {
  try {
    const response = await fetch('http://localhost:5003/health');
    if (response.ok) {
      const health = await response.json();
      log(`ML Backend health check passed - Model loaded: ${health.model_loaded}`);
    } else {
      log("ML Backend health check failed - will retry...");
      setTimeout(checkMLBackendHealth, 2000);
    }
  } catch (error) {
    log("ML Backend not ready yet - will retry...");
    setTimeout(checkMLBackendHealth, 2000);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  log("Shutting down servers...");
  if (mlBackendProcess) {
    mlBackendProcess.kill();
    log("ML Backend stopped");
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  log("Shutting down servers...");
  if (mlBackendProcess) {
    mlBackendProcess.kill();
    log("ML Backend stopped");
  }
  process.exit(0);
});

// Request logging middleware
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

// Main server startup
(async () => {
  const server = await registerRoutes(app);

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup Vite in development or serve static files in production
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start ML Backend automatically
  startMLBackend();

  // Start server
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, "0.0.0.0", () => {
    log(`Express server running on port ${port}`);
    log(`Frontend available at http://localhost:${port}`);
    log(`ML Backend available at http://localhost:5003`);
    log(`API endpoints available at http://localhost:${port}/api/*`);
  });
})();
