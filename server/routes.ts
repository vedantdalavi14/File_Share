import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFileSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // File upload endpoint
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const file = req.file;
      const uuid = randomUUID();
      
      // Calculate expiry time (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Create file record
      const fileRecord = await storage.createFile({
        uuid,
        filename: `${uuid}_${file.originalname}`,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        storagePath: file.path,
        downloadCount: 0,
        expiresAt,
        isExpired: false,
      });

      res.json({
        success: true,
        fileId: uuid,
        filename: file.originalname,
        fileSize: file.size,
        downloadUrl: `/api/download/${uuid}`,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ 
        message: "Upload failed", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // File download endpoint
  app.get("/api/download/:uuid", async (req, res) => {
    try {
      const { uuid } = req.params;
      
      const file = await storage.getFileByUuid(uuid);
      if (!file) {
        return res.status(404).json({ message: "File not found or expired" });
      }

      // Check if file is expired
      if (new Date() > file.expiresAt || file.isExpired) {
        await storage.markFileAsExpired(uuid);
        return res.status(410).json({ message: "File has expired" });
      }

      // Update download count
      await storage.updateDownloadCount(uuid);

      // Check if file exists on disk
      try {
        await fs.access(file.storagePath);
      } catch {
        return res.status(404).json({ message: "File not found on storage" });
      }

      // Set appropriate headers
      res.setHeader("Content-Disposition", `attachment; filename="${file.originalName}"`);
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Content-Length", file.fileSize.toString());

      // Stream the file
      const fileStream = await fs.readFile(file.storagePath);
      res.send(fileStream);
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ 
        message: "Download failed", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Get file info endpoint
  app.get("/api/file/:uuid", async (req, res) => {
    try {
      const { uuid } = req.params;
      
      const file = await storage.getFileByUuid(uuid);
      if (!file) {
        return res.status(404).json({ message: "File not found or expired" });
      }

      // Check if file is expired
      if (new Date() > file.expiresAt || file.isExpired) {
        await storage.markFileAsExpired(uuid);
        return res.status(410).json({ message: "File has expired" });
      }

      res.json({
        uuid: file.uuid,
        filename: file.originalName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        downloadCount: file.downloadCount,
        createdAt: file.createdAt,
        expiresAt: file.expiresAt,
      });
    } catch (error) {
      console.error("File info error:", error);
      res.status(500).json({ 
        message: "Failed to get file info", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Cleanup expired files endpoint (can be called by cron job)
  app.post("/api/cleanup", async (req, res) => {
    try {
      const deletedCount = await storage.deleteExpiredFiles();
      res.json({ 
        success: true, 
        deletedCount,
        message: `Cleaned up ${deletedCount} expired files` 
      });
    } catch (error) {
      console.error("Cleanup error:", error);
      res.status(500).json({ 
        message: "Cleanup failed", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
