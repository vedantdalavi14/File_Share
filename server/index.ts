import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const port = process.env.PORT || 8080;

// Enable CORS for all routes
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true
}));

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

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO with CORS configuration
const io = new Server(server, {
  cors: {
    origin: true, // Allow all origins in development
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Add connection logging
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

(async () => {
  registerRoutes(app, io);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  }
  // All API requests should be handled before this point, so if we get here
  // and the path is for an api route, it's a 404
  app.use("/api/*", (req, res) => {
    res.status(404).json({ message: "API route not found." });
  });

  // ALWAYS serve the app on the configured port
  server.listen({
    port: Number(port),
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });

  // Schedule a job to delete expired files every hour.
  const ONE_HOUR = 60 * 60 * 1000;
  setInterval(async () => {
    try {
      log("⏳ Running scheduled job: Deleting expired files...");
      const deletedCount = await storage.deleteExpiredFiles();
      if (deletedCount > 0) {
        log(`✅ Successfully deleted ${deletedCount} expired files.`);
      } else {
        log("👍 No expired files to delete.");
      }
    } catch (error) {
      console.error("❌ Error during scheduled file deletion:", error);
    }
  }, ONE_HOUR);
})();
