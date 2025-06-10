import { files, users, rooms, type File, type InsertFile, type User, type InsertUser, type Room, type InsertRoom } from "@shared/schema";
import { eq, lt, and, sql, inArray } from "drizzle-orm";
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { supabaseAdmin } from "./supabase";

export interface IStorage {
  createFile(file: InsertFile): Promise<File>;
  getFileByUuid(uuid: string): Promise<File | undefined>;
  updateDownloadCount(uuid: string): Promise<void>;
  deleteExpiredFiles(): Promise<number>;
  markFileAsExpired(uuid: string): Promise<void>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createRoom(room: InsertRoom): Promise<Room>;
  getRoom(id: string): Promise<Room | undefined>;
  deactivateRoom(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private db;

  constructor() {
    console.log("🚀 Initializing DatabaseStorage...");
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    
    // Supabase pooler requires to disable prepared statements
    const connectionString = process.env.DATABASE_URL;
    const client = postgres(connectionString, { prepare: false });
    this.db = drizzle(client);
  }

  async createFile(file: InsertFile): Promise<File> {
    const [inserted] = await this.db.insert(files).values(file).returning();
    return inserted;
  }

  async getFileByUuid(uuid: string): Promise<File | undefined> {
    const [file] = await this.db
      .select()
      .from(files)
      .where(eq(files.uuid, uuid))
      .limit(1);
    
    return file;
  }

  async updateDownloadCount(uuid: string): Promise<void> {
    await this.db
      .update(files)
      .set({ 
        downloadCount: sql`download_count + 1` 
      })
      .where(eq(files.uuid, uuid));
  }

  async deleteExpiredFiles(): Promise<number> {
    const now = new Date();
    
    // 1. Find expired file records from the database
    const expiredDbRecords = await this.db
      .select({
        id: files.id,
        storagePath: files.storagePath
      })
      .from(files)
      .where(lt(files.expiresAt, now));

    if (expiredDbRecords.length === 0) {
      return 0;
    }

    // 2. Delete the actual files from Supabase Storage
    const filePaths = expiredDbRecords.map(f => f.storagePath);
    const { error: storageError } = await supabaseAdmin.storage.from('files').remove(filePaths);

    if (storageError) {
      // Log the error but continue to delete from DB. In a production system,
      // you might implement a more robust retry mechanism or flag for manual review.
      console.error("Error deleting files from Supabase storage:", storageError);
    }

    // 3. Delete the records from the database
    const expiredFileIds = expiredDbRecords.map(f => f.id);
    const deletedDbRecords = await this.db
      .delete(files)
      .where(inArray(files.id, expiredFileIds))
      .returning({ id: files.id });
    
    return deletedDbRecords.length;
  }

  async markFileAsExpired(uuid: string): Promise<void> {
    await this.db
      .update(files)
      .set({ isExpired: true })
      .where(eq(files.uuid, uuid));
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [inserted] = await this.db.insert(users).values(user).returning();
    return inserted;
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [inserted] = await this.db.insert(rooms).values(room).returning();
    return inserted;
  }

  async getRoom(id: string): Promise<Room | undefined> {
    const [room] = await this.db
      .select()
      .from(rooms)
      .where(eq(rooms.id, id))
      .limit(1);
    return room;
  }

  async deactivateRoom(id: string): Promise<void> {
    await this.db
      .update(rooms)
      .set({ isActive: false })
      .where(eq(rooms.id, id));
  }
}

export class MemStorage implements IStorage {
  private files: Map<string, File>;
  private users: Map<number, User>;
  private rooms: Map<string, Room>;
  private currentId: number;
  currentUserId: number;

  constructor() {
    console.log("🚀 Initializing MemStorage...");
    this.files = new Map();
    this.users = new Map();
    this.rooms = new Map();
    this.currentId = 1;
    this.currentUserId = 1;
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = this.currentId++;
    const file: File = { 
      id,
      uuid: insertFile.uuid,
      filename: insertFile.filename,
      originalName: insertFile.originalName,
      mimeType: insertFile.mimeType,
      fileSize: insertFile.fileSize,
      storagePath: insertFile.storagePath,
      downloadCount: insertFile.downloadCount || 0,
      createdAt: new Date(),
      expiresAt: insertFile.expiresAt,
      isExpired: insertFile.isExpired || false,
    };
    this.files.set(file.uuid, file);
    return file;
  }

  async getFileByUuid(uuid: string): Promise<File | undefined> {
    const file = this.files.get(uuid);
    if (file && new Date() > file.expiresAt) {
      this.files.delete(uuid);
      return undefined;
    }
    return file;
  }

  async updateDownloadCount(uuid: string): Promise<void> {
    const file = this.files.get(uuid);
    if (file) {
      file.downloadCount += 1;
      this.files.set(uuid, file);
    }
  }

  async deleteExpiredFiles(): Promise<number> {
    const now = new Date();
    let deletedCount = 0;
    
    for (const [uuid, file] of Array.from(this.files.entries())) {
      if (file.expiresAt < now) {
        this.files.delete(uuid);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  async markFileAsExpired(uuid: string): Promise<void> {
    const file = this.files.get(uuid);
    if (file) {
      file.isExpired = true;
      this.files.set(uuid, file);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const room: Room = {
      ...insertRoom,
      createdAt: new Date(),
      isActive: true,
    };
    this.rooms.set(room.id, room);
    return room;
  }

  async getRoom(id: string): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async deactivateRoom(id: string): Promise<void> {
    const room = this.rooms.get(id);
    if (room) {
      room.isActive = false;
      this.rooms.set(id, room);
    }
  }
}

// Switch to database storage once DATABASE_URL is properly configured
// For production, you would use this:
// export const storage = new DatabaseStorage();

// For now, to ensure the app works immediately without a database connection string:
export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
