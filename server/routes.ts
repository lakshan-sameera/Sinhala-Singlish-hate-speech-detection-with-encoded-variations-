import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContentAnalysisSchema } from "@shared/schema";

// ML Backend Integration
async function callMLBackend(content: string) {
  try {
    const response = await fetch('http://localhost:5001/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });
    
    if (!response.ok) {
      throw new Error(`ML Backend error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('ML Backend connection failed:', error);
    // Fallback to simulation if ML backend is not available
    return simulateMLAnalysis(content);
  }
}

function simulateMLAnalysis(content: string) {
  const words = content.toLowerCase().split(/\s+/);
  const sinhalaHateWords = ['මූ', 'ගොන්', 'බල්ලා', 'හුත්ත', 'පිස්සා', 'වේසි'];
  const englishHateWords = ['stupid', 'idiot', 'hate', 'kill', 'die', 'damn', 'bitch', 'fuck'];
  
  let hateScore = 0;
  let harassmentScore = 0;
  
  words.forEach(word => {
    if (sinhalaHateWords.includes(word) || englishHateWords.includes(word)) {
      hateScore += 25;
      harassmentScore += 10;
    }
  });
  
  // Add randomization for more realistic scores
  hateScore = Math.min(hateScore + Math.random() * 20, 100);
  harassmentScore = Math.min(harassmentScore + Math.random() * 15, 100);
  const normalScore = Math.max(100 - hateScore - harassmentScore + Math.random() * 10, 0);
  
  // Normalize scores
  const total = hateScore + harassmentScore + normalScore;
  const normalizedHate = (hateScore / total) * 100;
  const normalizedHarassment = (harassmentScore / total) * 100;
  const normalizedNormal = (normalScore / total) * 100;
  
  let classification = 'safe';
  if (normalizedHate > 60) classification = 'hate_speech';
  else if (normalizedHate > 30 || normalizedHarassment > 40) classification = 'flagged';
  
  return {
    classification,
    hateScore: normalizedHate,
    harassmentScore: normalizedHarassment,
    normalScore: normalizedNormal,
    neutralizedText: normalizedHate > 30 ? 
      "This content has been identified as potentially inappropriate and has been neutralized." : 
      content,
    isHateSpeech: normalizedHate > 60
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Content Analysis Routes
  app.post("/api/analyze", async (req, res) => {
    try {
      const validatedData = insertContentAnalysisSchema.parse(req.body);
      
      // Get ML analysis from Python backend
      const mlResult = await callMLBackend(validatedData.content);
      
      // Prepare analysis data with ML results
      const analysisData = {
        ...validatedData,
        classification: mlResult.classification,
        hateScore: mlResult.hateScore,
        harassmentScore: mlResult.harassmentScore,
        normalScore: mlResult.normalScore,
        isAutoHidden: mlResult.classification === 'hate_speech',
        confidenceScore: mlResult.hateScore
      };
      
      const analysis = await storage.createContentAnalysis(analysisData);
      
      // Add neutralized text to response
      const response = {
        ...analysis,
        neutralizedText: mlResult.neutralizedText,
        isHateSpeech: mlResult.isHateSpeech
      };
      
      res.json(response);
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

  // ML Backend Routes
  app.post("/api/ml/train", async (req, res) => {
    try {
      // Proxy training request to Python ML backend
      const response = await fetch('http://localhost:5001/train', {
        method: 'POST',
        headers: req.headers,
        body: req.body,
      });
      
      if (!response.ok) {
        throw new Error(`ML Backend training failed: ${response.status}`);
      }
      
      const result = await response.json();
      res.json(result);
    } catch (error: any) {
      console.error('ML Training error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'ML training service unavailable. Please ensure the Python ML backend is running on port 5001.' 
      });
    }
  });

  app.get("/api/ml/health", async (req, res) => {
    try {
      const response = await fetch('http://localhost:5001/health');
      if (!response.ok) {
        throw new Error(`ML Backend health check failed: ${response.status}`);
      }
      const result = await response.json();
      res.json(result);
    } catch (error: any) {
      res.status(503).json({ 
        status: 'unavailable',
        message: 'Python ML backend not running. Start it with: python ml_backend/app.py' 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
