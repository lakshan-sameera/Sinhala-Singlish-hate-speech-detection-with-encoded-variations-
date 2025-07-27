import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContentAnalysisSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Content Analysis Routes
  app.post("/api/analyze", async (req, res) => {
    try {
      const validatedData = insertContentAnalysisSchema.parse(req.body);
      const analysis = await storage.createContentAnalysis(validatedData);
      res.json(analysis);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/analysis", async (req, res) => {
    try {
      const analyses = await storage.getAllContentAnalysis();
      res.json(analyses.slice(0, 10)); // Return recent 10
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/analysis/:id", async (req, res) => {
    try {
      const analysis = await storage.getContentAnalysis(req.params.id);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }
      res.json(analysis);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Moderation Queue Routes
  app.get("/api/moderation-queue", async (req, res) => {
    try {
      const queue = await storage.getModerationQueue();
      
      // Enrich with content data
      const enrichedQueue = await Promise.all(
        queue.map(async (item) => {
          const content = await storage.getContentAnalysis(item.contentId);
          return {
            ...item,
            content: content || null,
          };
        })
      );
      
      res.json(enrichedQueue);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/moderation-queue/:id/approve", async (req, res) => {
    try {
      const queueItem = await storage.updateModerationQueueItem(req.params.id, {
        status: "reviewed",
      });
      
      // Update the content analysis
      await storage.updateContentAnalysis(queueItem.contentId, {
        reviewStatus: "approved",
        isManuallyReviewed: true,
        reviewedBy: "admin", // In real app, get from auth
      });
      
      res.json({ message: "Content approved successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/moderation-queue/:id/remove", async (req, res) => {
    try {
      const queueItem = await storage.updateModerationQueueItem(req.params.id, {
        status: "reviewed",
      });
      
      // Update the content analysis
      await storage.updateContentAnalysis(queueItem.contentId, {
        reviewStatus: "removed",
        isManuallyReviewed: true,
        isAutoHidden: true,
        reviewedBy: "admin", // In real app, get from auth
      });
      
      res.json({ message: "Content removed successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // System Stats Route
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
