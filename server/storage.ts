import { 
  type User, 
  type InsertUser, 
  type ContentAnalysis, 
  type InsertContentAnalysis,
  type ModerationQueue,
  type InsertModerationQueue,
  type SystemStats
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Content Analysis methods
  createContentAnalysis(analysis: InsertContentAnalysis): Promise<ContentAnalysis>;
  getContentAnalysis(id: string): Promise<ContentAnalysis | undefined>;
  getAllContentAnalysis(): Promise<ContentAnalysis[]>;
  updateContentAnalysis(id: string, updates: Partial<ContentAnalysis>): Promise<ContentAnalysis>;

  // Moderation Queue methods
  createModerationQueueItem(item: InsertModerationQueue): Promise<ModerationQueue>;
  getModerationQueue(): Promise<ModerationQueue[]>;
  updateModerationQueueItem(id: string, updates: Partial<ModerationQueue>): Promise<ModerationQueue>;
  removeModerationQueueItem(id: string): Promise<void>;

  // System Stats methods
  getSystemStats(): Promise<SystemStats>;
  updateSystemStats(stats: Partial<SystemStats>): Promise<SystemStats>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private contentAnalyses: Map<string, ContentAnalysis> = new Map();
  private moderationQueues: Map<string, ModerationQueue> = new Map();
  private systemStats: SystemStats;

  constructor() {
    // Initialize with default stats
    this.systemStats = {
      id: randomUUID(),
      totalAnalyzed: 24847,
      hateDetected: 1234,
      autoHidden: 892,
      accuracyRate: 94.7,
      date: new Date(),
    };

    // Create default admin user
    this.createUser({
      username: "admin",
      password: "admin123",
      role: "admin"
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createContentAnalysis(analysis: InsertContentAnalysis): Promise<ContentAnalysis> {
    const id = randomUUID();
    
    // Simulate ML model analysis
    const hateKeywords = ['මූ', 'ගොන්', 'stupid', 'hate', 'kill', 'දුක', 'අමාරු'];
    const content = analysis.content.toLowerCase();
    
    let hateScore = 0;
    let harassmentScore = 0;
    
    hateKeywords.forEach(keyword => {
      if (content.includes(keyword.toLowerCase())) {
        hateScore += 0.3;
        harassmentScore += 0.2;
      }
    });
    
    // Add randomness to simulate ML model uncertainty
    hateScore += Math.random() * 0.4;
    harassmentScore += Math.random() * 0.3;
    
    hateScore = Math.min(hateScore, 1);
    harassmentScore = Math.min(harassmentScore, 1);
    const normalScore = Math.max(0, 1 - hateScore - harassmentScore);
    
    const confidenceScore = Math.max(hateScore, harassmentScore, normalScore);
    
    let classification = "safe";
    if (hateScore > 0.6) {
      classification = "hate_speech";
    } else if (hateScore > 0.4 || harassmentScore > 0.5) {
      classification = "flagged";
    }
    
    const isAutoHidden = classification === "hate_speech" && confidenceScore > 0.8;
    
    const contentAnalysis: ContentAnalysis = {
      id,
      ...analysis,
      classification,
      confidenceScore: confidenceScore * 100,
      hateScore: hateScore * 100,
      harassmentScore: harassmentScore * 100,
      normalScore: normalScore * 100,
      isAutoHidden,
      isManuallyReviewed: false,
      reviewStatus: classification === "flagged" ? "pending" : null,
      reviewedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.contentAnalyses.set(id, contentAnalysis);
    
    // Update system stats
    this.systemStats.totalAnalyzed += 1;
    if (classification === "hate_speech" || classification === "flagged") {
      this.systemStats.hateDetected += 1;
    }
    if (isAutoHidden) {
      this.systemStats.autoHidden += 1;
    }
    
    // Add to moderation queue if flagged
    if (classification === "flagged" || (classification === "hate_speech" && confidenceScore > 0.7)) {
      await this.createModerationQueueItem({
        contentId: id,
        priority: classification === "hate_speech" ? "high" : "medium",
      });
    }
    
    return contentAnalysis;
  }

  async getContentAnalysis(id: string): Promise<ContentAnalysis | undefined> {
    return this.contentAnalyses.get(id);
  }

  async getAllContentAnalysis(): Promise<ContentAnalysis[]> {
    return Array.from(this.contentAnalyses.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async updateContentAnalysis(id: string, updates: Partial<ContentAnalysis>): Promise<ContentAnalysis> {
    const existing = this.contentAnalyses.get(id);
    if (!existing) {
      throw new Error("Content analysis not found");
    }
    
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.contentAnalyses.set(id, updated);
    return updated;
  }

  async createModerationQueueItem(item: InsertModerationQueue): Promise<ModerationQueue> {
    const id = randomUUID();
    const queueItem: ModerationQueue = {
      id,
      ...item,
      status: "pending",
      assignedTo: null,
      createdAt: new Date(),
    };
    this.moderationQueues.set(id, queueItem);
    return queueItem;
  }

  async getModerationQueue(): Promise<ModerationQueue[]> {
    return Array.from(this.moderationQueues.values())
      .filter(item => item.status === "pending")
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority as keyof typeof priorityOrder] - 
               priorityOrder[a.priority as keyof typeof priorityOrder];
      });
  }

  async updateModerationQueueItem(id: string, updates: Partial<ModerationQueue>): Promise<ModerationQueue> {
    const existing = this.moderationQueues.get(id);
    if (!existing) {
      throw new Error("Moderation queue item not found");
    }
    
    const updated = { ...existing, ...updates };
    this.moderationQueues.set(id, updated);
    return updated;
  }

  async removeModerationQueueItem(id: string): Promise<void> {
    this.moderationQueues.delete(id);
  }

  async getSystemStats(): Promise<SystemStats> {
    return this.systemStats;
  }

  async updateSystemStats(stats: Partial<SystemStats>): Promise<SystemStats> {
    this.systemStats = { ...this.systemStats, ...stats };
    return this.systemStats;
  }
}

export const storage = new MemStorage();
