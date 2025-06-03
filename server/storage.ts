import { files, type File, type InsertFile } from "@shared/schema";
import { eq, lt, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

export interface IStorage {
  createFile(file: InsertFile): Promise<File>;
  getFileByUuid(uuid: string): Promise<File | undefined>;
  updateDownloadCount(uuid: string): Promise<void>;
  deleteExpiredFiles(): Promise<number>;
  markFileAsExpired(uuid: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private db;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    
    const sql = neon(process.env.DATABASE_URL);
    this.db = drizzle(sql);
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
    const expired = await this.db
      .delete(files)
      .where(lt(files.expiresAt, now))
      .returning({ id: files.id });
    
    return expired.length;
  }

  async markFileAsExpired(uuid: string): Promise<void> {
    await this.db
      .update(files)
      .set({ isExpired: true })
      .where(eq(files.uuid, uuid));
  }
}

export class MemStorage implements IStorage {
  private files: Map<string, File>;
  private currentId: number;

  constructor() {
    this.files = new Map();
    this.currentId = 1;
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = this.currentId++;
    const file: File = { 
      ...insertFile, 
      id,
      createdAt: new Date(),
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
    
    for (const [uuid, file] of this.files.entries()) {
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
}

// Use database storage if DATABASE_URL is available, otherwise use memory storage
export const storage = process.env.DATABASE_URL 
  ? new DatabaseStorage() 
  : new MemStorage();
