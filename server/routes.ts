import type { Express, Request, Response } from "express";
import type { Server as SocketIOServer, Socket } from "socket.io";
import { storage } from "./storage";
import { insertRoomSchema } from "@shared/schema";
import { z } from "zod";
import { nanoid } from "nanoid";
import multer from "multer";
import { supabaseAdmin } from "./supabase";

const upload = multer();

// --- In-memory stores ---
// NOTE: These are not suitable for a multi-instance production environment.
// They are used here for simplicity in a single-instance setup.
export const p2pRooms = new Map<string, { id: string; createdAt: Date; isActive: boolean }>();
export const activeRooms = new Map<string, Set<string>>();
export const bidirectionalRooms = new Map<string, { id: string; createdAt: Date; hostId: string | null }>();
export const activeBidirectionalRooms = new Map<string, Set<string>>();


export function registerRoutes(app: Express, io: SocketIOServer) {
  // In-memory store for P2P room metadata
  // const p2pRooms = new Map<string, { id: string; createdAt: Date; isActive: boolean }>();
  // In-memory store for tracking clients in a room for signaling
  // const activeRooms = new Map<string, Set<string>>();
  
  // --- Stores for Bidirectional P2P ---
  // const bidirectionalRooms = new Map<string, { id: string; createdAt: Date; hostId: string | null }>();
  // const activeBidirectionalRooms = new Map<string, Set<string>>();

  // API Routes
  app.post("/api/rooms", async (_req: Request, res: Response) => {
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

  app.get("/api/rooms/:id", async (req: Request, res: Response) => {
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

  app.get("/api/files/:uuid", async (req: Request, res: Response) => {
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

  app.post("/api/files/upload", upload.none(), async (req: Request, res: Response) => {
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
  app.post("/api/files/finalize", async (req: Request, res: Response) => {
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

  // --- New Bidirectional P2P Routes ---
  app.post("/api/bidirectional-rooms", (_req: Request, res: Response) => {
    try {
      const roomId = nanoid(8);
      bidirectionalRooms.set(roomId, { id: roomId, createdAt: new Date(), hostId: null });
      activeBidirectionalRooms.set(roomId, new Set());
      console.log(`[BiDi] 🚪 Created room ${roomId}`);
      res.status(201).json({ roomId });
    } catch (error) {
      console.error("[BiDi] ❌ Failed to create room:", error);
      res.status(500).json({ error: "Failed to create room" });
    }
  });

  app.get("/api/bidirectional-rooms/:roomId", (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;
      const room = bidirectionalRooms.get(roomId);
      if (room) {
        res.json({
          roomId: room.id,
          participantCount: activeBidirectionalRooms.get(roomId)?.size || 0
        });
      } else {
        res.status(404).json({ error: "Room not found" });
      }
    } catch (error) {
      console.error("[BiDi] ❌ Failed to get room:", error);
      res.status(500).json({ error: "Failed to get room" });
    }
  });

  // Socket.IO signaling for WebRTC
  io.on("connection", (socket: Socket) => {
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
            // Also delete from the metadata store to prevent memory leak
            p2pRooms.delete(roomId);
            console.log(`Cleaned up empty room ${roomId}`);
          }
        }
      }
      // --- Handle Bidirectional Disconnect ---
      for (const [roomId, clients] of Array.from(activeBidirectionalRooms.entries())) {
        if (clients.has(socket.id)) {
          clients.delete(socket.id);
          console.log(`[BiDi] 🔌 Client ${socket.id} disconnected from room ${roomId}`);
          
          socket.to(roomId).emit("bidi-peer-left", socket.id);

          // If room is empty, remove it
          if (clients.size === 0) {
            activeBidirectionalRooms.delete(roomId);
            bidirectionalRooms.delete(roomId);
            console.log(`[BiDi] 🧼 Cleaned up empty room ${roomId}`);
          }
        }
      }
    });

    // --- Bidirectional P2P Signaling ---
    socket.on("bidi-join-room", ({ roomId }: { roomId: string }) => {
      if (!activeBidirectionalRooms.has(roomId)) {
        console.warn(`[BiDi] ⚠️ Client ${socket.id} tried to join non-existent room ${roomId}`);
        socket.emit("bidi-error", { message: "Room not found." });
        return;
      }
      
      const roomClients = activeBidirectionalRooms.get(roomId)!;
      if (roomClients.size >= 2) {
        console.warn(`[BiDi] ⚠️ Client ${socket.id} tried to join full room ${roomId}`);
        socket.emit("bidi-error", { message: "Room is full." });
        return;
      }

      socket.join(roomId);
      roomClients.add(socket.id);
      console.log(`[BiDi] 🤝 Client ${socket.id} joined room ${roomId}. Participants: ${roomClients.size}`);

      const otherClients = Array.from(roomClients).filter(id => id !== socket.id);
      
      // Notify existing clients
      otherClients.forEach(otherSocketId => {
        socket.to(otherSocketId).emit("bidi-peer-joined", { peerId: socket.id });
      });
      
      // Send participant list to new client
      socket.emit("bidi-room-participants", { participants: otherClients });
    });

    socket.on("bidi-leave-room", ({ roomId }: { roomId: string }) => {
      const roomClients = activeBidirectionalRooms.get(roomId);
      if (roomClients && roomClients.has(socket.id)) {
        socket.leave(roomId);
        roomClients.delete(socket.id);
        console.log(`[BiDi] 🚶 Client ${socket.id} left room ${roomId}`);

        // Notify the other peer
        socket.to(roomId).emit("bidi-peer-left", socket.id);

        // If the room is now empty, clean it up completely
        if (roomClients.size === 0) {
          activeBidirectionalRooms.delete(roomId);
          bidirectionalRooms.delete(roomId);
          console.log(`[BiDi] 🧼 Cleaned up empty room ${roomId} after user left`);
        }
      }
    });

    socket.on("bidi-webrtc-offer", (data: { targetId: string, offer: any, roomId: string }) => {
      console.log(`[BiDi] 📨 Offer from ${socket.id} to ${data.targetId}`);
      socket.to(data.targetId).emit("bidi-webrtc-offer", { offer: data.offer, fromId: socket.id });
    });

    socket.on("bidi-webrtc-answer", (data: { targetId: string, answer: any, roomId: string }) => {
      console.log(`[BiDi] 📩 Answer from ${socket.id} to ${data.targetId}`);
      socket.to(data.targetId).emit("bidi-webrtc-answer", { answer: data.answer, fromId: socket.id });
    });

    socket.on("bidi-webrtc-ice-candidate", (data: { targetId: string, candidate: any, roomId: string }) => {
      // This can be very verbose, so it's commented out by default.
      // console.log(`[BiDi] 🧊 ICE candidate from ${socket.id} to ${data.targetId}`);
      socket.to(data.targetId).emit("bidi-webrtc-ice-candidate", { candidate: data.candidate, fromId: socket.id });
    });
    
    socket.on("bidi-chat-message", (data: { roomId: string, message: string }) => {
      console.log(`[BiDi] 💬 Chat from ${socket.id} in room ${data.roomId}: ${data.message}`);
      socket.to(data.roomId).emit("bidi-chat-message", {
        message: data.message,
        fromId: socket.id,
        timestamp: new Date()
      });
    });

    socket.on("bidi-file-incoming", (data) => {
      console.log(`[BiDi] 📥 File incoming from ${socket.id} in room ${data.roomId}: ${data.fileName}`);
      socket.to(data.roomId).emit("bidi-file-incoming", {
        fileName: data.fileName,
        fileSize: data.fileSize,
        transferId: data.transferId,
        fromId: socket.id
      });
    });

  });
}

const STALE_THRESHOLD = 1000 * 60 * 60; // 1 hour in milliseconds

export function cleanupStaleRooms() {
  const now = Date.now();
  let cleanedCount = 0;

  console.log("🧹 Running stale room cleanup job...");

  // Clean P2P rooms
  p2pRooms.forEach((room, roomId) => {
    const participants = activeRooms.get(roomId);
    if ((!participants || participants.size === 0) && (now - room.createdAt.getTime() > STALE_THRESHOLD)) {
      p2pRooms.delete(roomId);
      activeRooms.delete(roomId);
      cleanedCount++;
      console.log(`🧼 Cleaned up stale P2P room ${roomId}`);
    }
  });

  // Clean Bidirectional rooms
  bidirectionalRooms.forEach((room, roomId) => {
    const participants = activeBidirectionalRooms.get(roomId);
    if ((!participants || participants.size === 0) && (now - room.createdAt.getTime() > STALE_THRESHOLD)) {
      bidirectionalRooms.delete(roomId);
      activeBidirectionalRooms.delete(roomId);
      cleanedCount++;
      console.log(`🧼 Cleaned up stale Bidirectional room ${roomId}`);
    }
  });

  if (cleanedCount > 0) {
    console.log(`✅ Stale room cleanup finished. Removed ${cleanedCount} rooms.`);
  } else {
    console.log("✅ No stale rooms found.");
  }
}
