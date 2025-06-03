import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
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

// P2P Room management
interface P2PRoom {
  id: string;
  participants: Set<string>;
  createdAt: Date;
  isActive: boolean;
}

const p2pRooms = new Map<string, P2PRoom>();

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

  // P2P Room endpoints
  app.post("/api/p2p/create-room", (req, res) => {
    const roomId = randomUUID();
    const room: P2PRoom = {
      id: roomId,
      participants: new Set(),
      createdAt: new Date(),
      isActive: true,
    };
    p2pRooms.set(roomId, room);
    
    res.json({
      success: true,
      roomId,
      roomUrl: `/p2p/${roomId}`,
    });
  });

  app.get("/api/p2p/room/:roomId", (req, res) => {
    const { roomId } = req.params;
    const room = p2pRooms.get(roomId);
    
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }
    
    if (!room.isActive) {
      return res.status(410).json({ message: "Room is no longer active" });
    }
    
    res.json({
      roomId: room.id,
      participantCount: room.participants.size,
      isActive: room.isActive,
      createdAt: room.createdAt,
    });
  });

  const httpServer = createServer(app);
  
  // Setup Socket.IO for P2P signaling
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("create-room", (roomId: string) => {
      const room = p2pRooms.get(roomId);
      if (room && room.isActive) {
        socket.join(roomId);
        room.participants.add(socket.id);
        socket.emit("room-created", { roomId });
        console.log(`Room ${roomId} created by ${socket.id}`);
      } else {
        socket.emit("error", { message: "Invalid room ID" });
      }
    });

    socket.on("join-room", (roomId: string) => {
      const room = p2pRooms.get(roomId);
      if (!room || !room.isActive) {
        socket.emit("error", { message: "Room not found or inactive" });
        return;
      }

      if (room.participants.size >= 2) {
        socket.emit("error", { message: "Room is full" });
        return;
      }

      socket.join(roomId);
      room.participants.add(socket.id);
      
      // Notify other participants
      socket.to(roomId).emit("peer-joined", { peerId: socket.id });
      socket.emit("room-joined", { roomId, participantCount: room.participants.size });
      
      console.log(`${socket.id} joined room ${roomId}`);
    });

    socket.on("send-offer", ({ roomId, offer, targetPeerId }) => {
      socket.to(targetPeerId).emit("receive-offer", { 
        offer, 
        fromPeerId: socket.id 
      });
    });

    socket.on("send-answer", ({ roomId, answer, targetPeerId }) => {
      socket.to(targetPeerId).emit("receive-answer", { 
        answer, 
        fromPeerId: socket.id 
      });
    });

    socket.on("ice-candidate", ({ roomId, candidate, targetPeerId }) => {
      socket.to(targetPeerId).emit("ice-candidate", { 
        candidate, 
        fromPeerId: socket.id 
      });
    });

    socket.on("file-transfer-start", ({ roomId, fileName, fileSize, targetPeerId }) => {
      socket.to(targetPeerId).emit("file-transfer-start", { 
        fileName, 
        fileSize, 
        fromPeerId: socket.id 
      });
    });

    socket.on("file-transfer-progress", ({ roomId, progress, targetPeerId }) => {
      socket.to(targetPeerId).emit("file-transfer-progress", { 
        progress, 
        fromPeerId: socket.id 
      });
    });

    socket.on("file-transfer-complete", ({ roomId, targetPeerId }) => {
      socket.to(targetPeerId).emit("file-transfer-complete", { 
        fromPeerId: socket.id 
      });
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
      
      // Remove from all rooms
      for (const [roomId, room] of p2pRooms.entries()) {
        if (room.participants.has(socket.id)) {
          room.participants.delete(socket.id);
          socket.to(roomId).emit("peer-left", { peerId: socket.id });
          
          // Mark room as inactive if empty
          if (room.participants.size === 0) {
            room.isActive = false;
          }
        }
      }
    });
  });

  // Cleanup inactive rooms every 30 minutes
  setInterval(() => {
    const now = new Date();
    for (const [roomId, room] of p2pRooms.entries()) {
      const ageHours = (now.getTime() - room.createdAt.getTime()) / (1000 * 60 * 60);
      if (!room.isActive || ageHours > 2) { // Remove rooms older than 2 hours
        p2pRooms.delete(roomId);
        console.log(`Cleaned up room ${roomId}`);
      }
    }
  }, 30 * 60 * 1000);

  return httpServer;
}
