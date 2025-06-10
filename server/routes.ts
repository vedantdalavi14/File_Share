import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { insertRoomSchema } from "@shared/schema";
import { z } from "zod";
import { nanoid } from "nanoid";
import multer from "multer";
import { supabaseAdmin } from "./supabase";

const upload = multer();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize Socket.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // In-memory store for P2P room metadata
  const p2pRooms = new Map<string, { id: string; createdAt: Date; isActive: boolean }>();
  // In-memory store for tracking clients in a room for signaling
  const activeRooms = new Map<string, Set<string>>();

  // API Routes
  app.post("/api/rooms", async (req, res) => {
    try {
      const roomId = nanoid(8);
      // Create metadata
      const room = { id: roomId, createdAt: new Date(), isActive: true };
      p2pRooms.set(roomId, room);
      // Create signaling room
      activeRooms.set(roomId, new Set());
      res.status(201).json(room);
    } catch (error) {
      console.error("Failed to create room:", error);
      res.status(500).json({ error: "Failed to create room" });
    }
  });

  app.get("/api/rooms/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const room = p2pRooms.get(id);
      if (!room || !room.isActive) {
        return res.status(404).json({ error: "Room not found or is inactive" });
      }
      res.json(room);
    } catch (error) {
      console.error("Failed to get room:", error);
      res.status(500).json({ error: "Failed to get room" });
    }
  });

  app.get("/api/files/:uuid", async (req, res) => {
    try {
      const { uuid } = req.params;
      const file = await storage.getFileByUuid(uuid);

      if (!file || file.isExpired) {
        return res.status(404).json({ error: "File not found or has expired." });
      }

      // Generate a fresh, temporary public URL for the download, and instruct
      // the browser to download it with the original filename via the
      // Content-Disposition header.
      const { data } = supabaseAdmin.storage
        .from('files')
        .getPublicUrl(file.storagePath, {
          download: file.originalName, 
        });

      if (!data.publicUrl) {
        return res.status(500).json({ error: "Could not retrieve file URL." });
      }
      
      // We don't increment the download count here, but on actual download if needed.
      // For now, we just provide the info.
      
      res.json({
        uuid: file.uuid,
        fileName: file.originalName,
        fileSize: file.fileSize,
        expiresAt: file.expiresAt,
        downloadUrl: data.publicUrl,
      });

    } catch (error) {
      console.error("Failed to get file info:", error);
      res.status(500).json({ error: "Failed to retrieve file information." });
    }
  });

  app.post("/api/files/upload", upload.none(), async (req, res) => {
    try {
      const { fileName: originalName, fileType } = req.body;

      if (!originalName || !fileType) {
        return res.status(400).json({ error: "Filename and filetype are required." });
      }

      // 1. Sanitize the filename and create a unique path
      const safeOriginalName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '');
      const uniqueFileName = `${nanoid()}-${safeOriginalName}`;
      const filePath = `public/${uniqueFileName}`;

      // 2. Create a signed URL for the client to upload to
      const { data, error: signedUrlError } = await supabaseAdmin.storage
        .from('files')
        .createSignedUploadUrl(filePath);

      if (signedUrlError) {
        throw new Error(`Failed to create signed URL: ${signedUrlError.message}`);
      }
      
      const { signedUrl, token } = data;
      const newUuid = nanoid(12);
      
      // 3. We will create the DB record *after* the client confirms the upload is complete.
      // This is a more robust approach. So we will create a new endpoint for that.
      
      // 4. Return the signed URL and the file's future UUID to the client
      res.json({ 
        signedUrl,
        token,
        filePath,
        uuid: newUuid
      });

    } catch (error) {
      console.error("Failed to initiate upload:", error);
      res.status(500).json({ error: "Could not initiate file upload." });
    }
  });

  // This new endpoint is called by the client *after* a direct upload is successful.
  app.post("/api/files/finalize", async (req, res) => {
    try {
      const {
        uuid,
        filePath,
        originalName,
        fileSize,
        fileType
      } = req.body;

      // Create the file record in our database
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await storage.createFile({
        uuid,
        filename: filePath.split('/').pop() || '', // Extract filename from path
        originalName,
        fileSize,
        mimeType: fileType,
        storagePath: filePath,
        expiresAt,
      });

      // Return the final shareable link
      const shareLink = `${req.protocol}://${req.get('host')}/download/${uuid}`;
      res.json({ shareLink });

    } catch (error) {
      console.error("Failed to finalize upload:", error);
      res.status(500).json({ error: "Could not finalize file upload." });
    }
  });

  // Socket.IO signaling for WebRTC
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("join-room", (roomId: string) => {
      console.log(`Client ${socket.id} joining room ${roomId}`);
      socket.join(roomId);
      
      if (!activeRooms.has(roomId)) {
        // This case might happen if a user tries to join a room that was created
        // but all participants left, causing it to be cleaned up.
        // Or if they try a non-existent room URL.
        // We can silently fail or create a new one. For now, we'll create it.
        console.log(`Room ${roomId} not found in activeRooms, creating it.`);
        activeRooms.set(roomId, new Set());
        if (!p2pRooms.has(roomId)) {
          p2pRooms.set(roomId, { id: roomId, createdAt: new Date(), isActive: true });
        }
      }
      
      const roomClients = activeRooms.get(roomId)!;
      roomClients.add(socket.id);
      
      // Notify others in the room
      socket.to(roomId).emit("peer-joined", socket.id);
      
      // Send current participants to the new client
      socket.emit("room-participants", Array.from(roomClients).filter(id => id !== socket.id));
    });

    socket.on("webrtc-offer", (data: { roomId: string; offer: RTCSessionDescriptionInit; targetId: string }) => {
      console.log(`WebRTC offer from ${socket.id} to ${data.targetId} in room ${data.roomId}`);
      socket.to(data.targetId).emit("webrtc-offer", {
        offer: data.offer,
        fromId: socket.id
      });
    });

    socket.on("webrtc-answer", (data: { roomId: string; answer: RTCSessionDescriptionInit; targetId: string }) => {
      console.log(`WebRTC answer from ${socket.id} to ${data.targetId} in room ${data.roomId}`);
      socket.to(data.targetId).emit("webrtc-answer", {
        answer: data.answer,
        fromId: socket.id
      });
    });

    socket.on("webrtc-ice-candidate", (data: { roomId: string; candidate: RTCIceCandidateInit; targetId: string }) => {
      console.log(`ICE candidate from ${socket.id} to ${data.targetId} in room ${data.roomId}`);
      socket.to(data.targetId).emit("webrtc-ice-candidate", {
        candidate: data.candidate,
        fromId: socket.id
      });
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      
      // Remove from all rooms
      for (const [roomId, clients] of Array.from(activeRooms.entries())) {
        if (clients.has(socket.id)) {
          clients.delete(socket.id);
          socket.to(roomId).emit("peer-left", socket.id);
          
          // Clean up empty rooms
          if (clients.size === 0) {
            activeRooms.delete(roomId);
            // Also deactivate in the metadata store
            const room = p2pRooms.get(roomId);
            if (room) {
              room.isActive = false;
            }
            console.log(`Cleaned up empty room ${roomId}`);
          }
        }
      }
    });
  });

  return httpServer;
}
