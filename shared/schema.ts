import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("moderator"),
});

export const contentAnalysis = pgTable("content_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  classification: text("classification").notNull(), // "safe", "flagged", "hate_speech"
  confidenceScore: real("confidence_score").notNull(),
  hateScore: real("hate_score").notNull(),
  harassmentScore: real("harassment_score").notNull(),
  normalScore: real("normal_score").notNull(),
  isAutoHidden: boolean("is_auto_hidden").notNull().default(false),
  isManuallyReviewed: boolean("is_manually_reviewed").notNull().default(false),
  reviewStatus: text("review_status"), // "pending", "approved", "removed"
  reviewedBy: varchar("reviewed_by"),
  platform: text("platform").default("manual"),
  userId: text("user_id"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const moderationQueue = pgTable("moderation_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
  priority: text("priority").notNull().default("medium"), // "low", "medium", "high"
  status: text("status").notNull().default("pending"), // "pending", "reviewed"
  assignedTo: varchar("assigned_to"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const systemStats = pgTable("system_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  totalAnalyzed: integer("total_analyzed").notNull().default(0),
  hateDetected: integer("hate_detected").notNull().default(0),
  autoHidden: integer("auto_hidden").notNull().default(0),
  accuracyRate: real("accuracy_rate").notNull().default(0),
  date: timestamp("date").notNull().default(sql`now()`),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export const insertContentAnalysisSchema = createInsertSchema(contentAnalysis).pick({
  content: true,
  platform: true,
  userId: true,
});

export const insertModerationQueueSchema = createInsertSchema(moderationQueue).pick({
  contentId: true,
  priority: true,
  assignedTo: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type ContentAnalysis = typeof contentAnalysis.$inferSelect;
export type InsertContentAnalysis = z.infer<typeof insertContentAnalysisSchema>;
export type ModerationQueue = typeof moderationQueue.$inferSelect;
export type InsertModerationQueue = z.infer<typeof insertModerationQueueSchema>;
export type SystemStats = typeof systemStats.$inferSelect;
