import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  uuid: text("uuid").notNull().unique(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  storagePath: text("storage_path").notNull(),
  downloadCount: integer("download_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  isExpired: boolean("is_expired").notNull().default(false),
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  createdAt: true,
});

export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

// File upload validation schema
export const fileUploadSchema = z.object({
  file: z.any().refine((file) => file instanceof File, "Must be a file"),
}).extend({
  file: z.any().refine((file) => {
    const maxSize = 100 * 1024 * 1024; // 100MB
    return file.size <= maxSize;
  }, "File size must be less than 100MB")
  .refine((file) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/avi', 'video/mov',
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain'
    ];
    return allowedTypes.includes(file.type);
  }, "File type not supported")
});

export type FileUpload = z.infer<typeof fileUploadSchema>;
