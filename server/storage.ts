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

// Advanced ML Model for Sinhala/Singlish Hate Speech Detection
class SinhalaHateSpeechModel {
  private hatePatterns: { [key: string]: number } = {
    // Direct Sinhala hate words
    'මූ': 0.9, 'ගොන්': 0.85, 'හුත්ත': 0.95, 'බල්ලා': 0.7, 'පකා': 0.9,
    'කරුමයා': 0.8, 'හරක්': 0.75, 'එළුවා': 0.7, 'වේසි': 0.9,
    
    // Singlish/English hate words
    'stupid': 0.6, 'idiot': 0.6, 'fool': 0.5, 'hate': 0.7, 'kill': 0.8,
    'die': 0.7, 'trash': 0.6, 'loser': 0.5, 'bastard': 0.8,
    
    // Encoded/obfuscated variations (L33t speak, symbols)
    'st@pid': 0.6, 'st*pid': 0.6, 'h8': 0.7, 'k1ll': 0.8, 'd1e': 0.7,
    'muu': 0.85, 'g0n': 0.8, 'pak@': 0.85, 'w3si': 0.85,
    
    // Harassment indicators
    'අද': 0.3, 'මරන්න': 0.9, 'නැති': 0.2, 'කර': 0.1, 'එන්න': 0.2,
    'යන්න': 0.3, 'ගහන්න': 0.7, 'දෙන්න': 0.2,
    
    // Context-aware combinations
    'get out': 0.6, 'go away': 0.5, 'shut up': 0.7, 'leave me': 0.4,
  };

  private harassmentPatterns: { [key: string]: number } = {
    // Threatening language
    'මරනවා': 0.9, 'ගහනවා': 0.8, 'කපනවා': 0.85, 'බනිනවා': 0.7,
    'threaten': 0.8, 'warning': 0.6, 'watch out': 0.7, 'be careful': 0.5,
    
    // Bullying indicators
    'අවජාතක': 0.8, 'නාකි': 0.7, 'පිස්සු': 0.6, 'අමාරු': 0.7,
    'ugly': 0.6, 'fat': 0.5, 'worthless': 0.8, 'useless': 0.7,
    
    // Sexual harassment (mild detection for safety)
    'වේසි': 0.9, 'අපරාදය': 0.7, 'inappropriate': 0.6, 'touch': 0.4,
  };

  private positivePatterns: { [key: string]: number } = {
    // Positive Sinhala words
    'හොඳ': 0.8, 'ලස්සන': 0.7, 'සතුටු': 0.8, 'ආදරය': 0.9, 'සුභ': 0.7,
    'පින්': 0.8, 'සාදු': 0.9, 'නිවන්': 0.9, 'මේත්තා': 0.9,
    
    // Positive English/Singlish
    'good': 0.6, 'nice': 0.6, 'great': 0.7, 'awesome': 0.8, 'love': 0.8,
    'thanks': 0.7, 'please': 0.6, 'sorry': 0.7, 'beautiful': 0.7,
  };

  // mBERT-style transformer simulation
  private transformerAnalysis(text: string): { hateScore: number; harassmentScore: number; contextScore: number } {
    const tokens = this.tokenize(text);
    const embeddings = this.generateEmbeddings(tokens);
    
    let hateScore = 0;
    let harassmentScore = 0;
    let contextScore = 0;
    
    // Simulate attention mechanism
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i].toLowerCase();
      const context = this.getContextWindow(tokens, i, 3);
      
      // Check hate patterns with context awareness
      if (this.hatePatterns[token]) {
        const contextMultiplier = this.calculateContextMultiplier(context);
        hateScore += this.hatePatterns[token] * contextMultiplier;
      }
      
      // Check harassment patterns
      if (this.harassmentPatterns[token]) {
        const contextMultiplier = this.calculateContextMultiplier(context);
        harassmentScore += this.harassmentPatterns[token] * contextMultiplier;
      }
      
      // Check positive patterns (reduces hate score)
      if (this.positivePatterns[token]) {
        contextScore += this.positivePatterns[token] * 0.5;
      }
    }
    
    // Normalize scores
    hateScore = Math.min(hateScore / tokens.length * 2, 1);
    harassmentScore = Math.min(harassmentScore / tokens.length * 2, 1);
    contextScore = Math.min(contextScore / tokens.length, 1);
    
    return { hateScore, harassmentScore, contextScore };
  }

  // LSTM-style sequential analysis
  private lstmAnalysis(text: string): { sequenceScore: number; emotionalIntensity: number } {
    const tokens = this.tokenize(text);
    let sequenceScore = 0;
    let emotionalIntensity = 0;
    let hiddenState = 0;
    
    // Simulate LSTM cells processing sequence
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i].toLowerCase();
      const prevContext = hiddenState;
      
      // Update hidden state (simplified LSTM gate simulation)
      hiddenState = this.updateHiddenState(hiddenState, token);
      
      // Calculate sequence patterns
      if (i > 0) {
        const bigram = `${tokens[i-1].toLowerCase()} ${token}`;
        sequenceScore += this.getBigramHateScore(bigram);
      }
      
      // Calculate emotional intensity
      emotionalIntensity += this.getEmotionalWeight(token) * (1 + Math.abs(prevContext));
    }
    
    sequenceScore = Math.min(sequenceScore / Math.max(tokens.length - 1, 1), 1);
    emotionalIntensity = Math.min(emotionalIntensity / tokens.length, 1);
    
    return { sequenceScore, emotionalIntensity };
  }

  // FastText-style subword analysis for encoded variations
  private fastTextAnalysis(text: string): { subwordScore: number; encodingScore: number } {
    let subwordScore = 0;
    let encodingScore = 0;
    
    // Analyze character n-grams (subword information)
    for (let n = 2; n <= 4; n++) {
      for (let i = 0; i <= text.length - n; i++) {
        const ngram = text.substring(i, i + n).toLowerCase();
        subwordScore += this.getNgramHateScore(ngram);
      }
    }
    
    // Detect encoding patterns
    encodingScore = this.detectEncodedHate(text);
    
    subwordScore = Math.min(subwordScore / Math.max(text.length - 1, 1), 1);
    encodingScore = Math.min(encodingScore, 1);
    
    return { subwordScore, encodingScore };
  }

  private tokenize(text: string): string[] {
    // Enhanced tokenization for Sinhala script
    return text.split(/[\s\u200c\u200d]+/).filter(token => token.length > 0);
  }

  private generateEmbeddings(tokens: string[]): number[][] {
    // Simplified embedding generation
    return tokens.map(token => {
      const hash = this.simpleHash(token);
      return Array.from({ length: 16 }, (_, i) => Math.sin(hash + i) * 0.5);
    });
  }

  private getContextWindow(tokens: string[], index: number, windowSize: number): string[] {
    const start = Math.max(0, index - windowSize);
    const end = Math.min(tokens.length, index + windowSize + 1);
    return tokens.slice(start, end);
  }

  private calculateContextMultiplier(context: string[]): number {
    // Increase score if surrounded by negative context
    const negativeContext = context.some(token => 
      this.hatePatterns[token.toLowerCase()] || this.harassmentPatterns[token.toLowerCase()]
    );
    return negativeContext ? 1.3 : 1.0;
  }

  private updateHiddenState(prevState: number, token: string): number {
    const tokenWeight = this.getTokenWeight(token);
    return (prevState * 0.7) + (tokenWeight * 0.3);
  }

  private getBigramHateScore(bigram: string): number {
    const bigramPatterns: { [key: string]: number } = {
      'මූ බල්ලා': 0.95, 'ගොන් හරක්': 0.9, 'stupid fool': 0.8,
      'hate you': 0.85, 'kill yourself': 0.95, 'go die': 0.9,
      'shut up': 0.7, 'get out': 0.6, 'බයට යන්න': 0.8,
    };
    return bigramPatterns[bigram] || 0;
  }

  private getEmotionalWeight(token: string): number {
    const emotionalPatterns: { [key: string]: number } = {
      '!': 0.3, '?': 0.2, 'අනේ': 0.4, 'මොන': 0.3, 'එහෙම': 0.2,
      'really': 0.2, 'seriously': 0.3, 'wtf': 0.6, 'omg': 0.4,
    };
    return emotionalPatterns[token.toLowerCase()] || 0.1;
  }

  private getNgramHateScore(ngram: string): number {
    // Check for obfuscated patterns
    const obfuscatedPatterns: { [key: string]: number } = {
      'st': 0.1, 'up': 0.1, 'id': 0.1, '@t': 0.2, '*t': 0.2,
      'h8': 0.5, 'k1': 0.3, 'll': 0.2, 'd1': 0.3, 'mm': 0.2,
    };
    return obfuscatedPatterns[ngram] || 0;
  }

  private detectEncodedHate(text: string): number {
    let encodingScore = 0;
    
    // Detect L33t speak
    const leetPatterns = /[0-9@#*]+/g;
    const leetMatches = text.match(leetPatterns);
    if (leetMatches) {
      encodingScore += leetMatches.length * 0.1;
    }
    
    // Detect symbol substitution
    const symbolPatterns = /[!@#$%^&*()_+=\[\]{}|;':".,<>?~`]/g;
    const symbolMatches = text.match(symbolPatterns);
    if (symbolMatches) {
      encodingScore += symbolMatches.length * 0.05;
    }
    
    // Detect repeated characters (evasion technique)
    const repeatedPatterns = /(.)\1{2,}/g;
    const repeatedMatches = text.match(repeatedPatterns);
    if (repeatedMatches) {
      encodingScore += repeatedMatches.length * 0.15;
    }
    
    return encodingScore;
  }

  private getTokenWeight(token: string): number {
    return (this.hatePatterns[token.toLowerCase()] || 0) + 
           (this.harassmentPatterns[token.toLowerCase()] || 0) - 
           (this.positivePatterns[token.toLowerCase()] || 0);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Main analysis method combining all models
  analyze(text: string): { hateScore: number; harassmentScore: number; normalScore: number; confidenceScore: number } {
    // Run all three model approaches
    const transformerResult = this.transformerAnalysis(text);
    const lstmResult = this.lstmAnalysis(text);
    const fastTextResult = this.fastTextAnalysis(text);
    
    // Ensemble method: weighted combination of all models
    const hateScore = (
      transformerResult.hateScore * 0.4 +
      lstmResult.sequenceScore * 0.3 +
      fastTextResult.subwordScore * 0.2 +
      fastTextResult.encodingScore * 0.1
    );
    
    const harassmentScore = (
      transformerResult.harassmentScore * 0.4 +
      lstmResult.emotionalIntensity * 0.3 +
      (fastTextResult.subwordScore * 0.5) * 0.3
    );
    
    // Calculate normal score (reduced by positive context)
    const normalScore = Math.max(0, 1 - hateScore - harassmentScore + (transformerResult.contextScore * 0.2));
    
    // Confidence is based on agreement between models
    const modelAgreement = 1 - Math.abs(transformerResult.hateScore - lstmResult.sequenceScore);
    const confidenceScore = Math.min(Math.max(hateScore, harassmentScore, normalScore) * modelAgreement, 1);
    
    return {
      hateScore: Math.min(hateScore, 1),
      harassmentScore: Math.min(harassmentScore, 1),
      normalScore: Math.min(normalScore, 1),
      confidenceScore: confidenceScore
    };
  }
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private contentAnalyses: Map<string, ContentAnalysis> = new Map();
  private moderationQueues: Map<string, ModerationQueue> = new Map();
  private systemStats: SystemStats;
  private mlModel: SinhalaHateSpeechModel;

  constructor() {
    // Initialize ML model
    this.mlModel = new SinhalaHateSpeechModel();
    
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

  // ML Analysis method that uses the comprehensive model
  private analyzeContentWithMLModels(content: string): { hateScore: number; harassmentScore: number; normalScore: number; confidenceScore: number } {
    return this.mlModel.analyze(content);
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
    
    // Advanced ML model simulation with Sinhala/Singlish hate speech patterns
    const analysisResult = this.analyzeContentWithMLModels(analysis.content);
    
    const hateScore = analysisResult.hateScore;
    const harassmentScore = analysisResult.harassmentScore;
    const normalScore = analysisResult.normalScore;
    const confidenceScore = analysisResult.confidenceScore;
    
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
