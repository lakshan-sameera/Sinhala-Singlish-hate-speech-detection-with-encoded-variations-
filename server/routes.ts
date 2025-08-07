import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContentAnalysisSchema } from "@shared/schema";

// ML Backend Integration
async function callMLBackend(content: string) {
  try {
    const response = await fetch('http://localhost:5003/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: content }),
    });
    
    if (!response.ok) {
      throw new Error(`ML Backend error: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Check if ML backend returned an error
    if (result.error) {
      throw new Error(`ML Backend error: ${result.error}`);
    }
    
    // Map our enhanced ML backend response to the expected format
    const prediction = result.prediction; // 'NOT' or 'OFF'
    const confidence = result.confidence;
    const probabilities = result.probabilities;
    const analysis = result.analysis;
    
    // Enhanced classification logic using both LSTM and fuzzy matching
    let classification = 'safe';
    let hateScore = 0;
    let harassmentScore = 0;
    let normalScore = 0;
    
    // Calculate hate score from analysis
    hateScore = (analysis.hate_score || 0) * 100;
    
    // Enhanced decision logic combining LSTM and fuzzy matching
    const lstm_contribution = analysis.lstm_contribution || 0;
    const fuzzy_confidence = analysis.fuzzy_confidence || 0;
    const hate_words_detected = analysis.hate_words_found && analysis.hate_words_found.length > 0;
    
    if (prediction === 'OFF') {
      // LSTM detected hate speech
      if (hate_words_detected && fuzzy_confidence > 0.7) {
        classification = 'hate_speech';
        harassmentScore = Math.max(confidence * 90, fuzzy_confidence * 100);
      } else {
        classification = 'flagged';
        harassmentScore = confidence * 80;
      }
      normalScore = (1 - confidence) * 100;
    } else if (prediction === 'NOT') {
      // LSTM says safe, but check fuzzy matching
      if (hate_words_detected && fuzzy_confidence > 0.8) {
        classification = 'flagged'; // High confidence fuzzy match overrides LSTM
        harassmentScore = fuzzy_confidence * 70;
        normalScore = (1 - fuzzy_confidence) * 100;
      } else if (hate_words_detected && fuzzy_confidence > 0.6) {
        classification = 'flagged'; // Medium confidence fuzzy match
        harassmentScore = fuzzy_confidence * 60;
        normalScore = (1 - fuzzy_confidence) * 100;
      } else {
        classification = 'safe';
        harassmentScore = (1 - confidence) * 100;
        normalScore = confidence * 100;
      }
    } else {
      // Fallback for unknown predictions
      classification = 'flagged';
      harassmentScore = confidence * 100;
      normalScore = (1 - confidence) * 100;
    }
    
    return {
      classification,
      hateScore: Math.round(hateScore),
      harassmentScore: Math.round(harassmentScore),
      normalScore: Math.round(normalScore),
      confidenceScore: Math.round(confidence * 100),
      isHateSpeech: classification === 'hate_speech',
      neutralizedText: classification !== 'safe' ? `[Content flagged as ${classification}]` : content,
      probabilities,
      analysis: {
        hateScore: analysis.hate_score || 0,
        hateWordsFound: analysis.hate_words_found || [],
        hateWordCount: analysis.hate_word_count || 0,
        sinhalaRatio: analysis.sinhala_ratio || 0,
        hasObfuscation: analysis.has_obfuscation || false,
        obfuscationScore: analysis.obfuscation_score || 0,
        modelsUsed: {
          lstm: analysis.models_used?.lstm || false,
          mbert: analysis.models_used?.mbert || false,
          academic_preprocessing: analysis.models_used?.academic_preprocessing || false
        }
      }
    };
  } catch (error) {
    console.error('ML Backend connection failed:', error);
    throw new Error('ML Backend service unavailable');
  }
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
        confidenceScore: mlResult.confidenceScore
      };
      
      const analysis = await storage.createContentAnalysis(analysisData);
      
      // Add neutralized text and probabilities to response
      const response = {
        ...analysis,
        classification: mlResult.classification, // Ensure ML result classification is preserved
        hateScore: mlResult.hateScore, // Ensure hate score is preserved
        neutralizedText: mlResult.neutralizedText,
        isHateSpeech: mlResult.isHateSpeech,
        probabilities: mlResult.probabilities,
        analysis: {
          ...mlResult.analysis,
          // Enhanced features from new ML model
          lstm_contribution: mlResult.analysis.lstm_contribution || 0,
          fuzzy_confidence: mlResult.analysis.fuzzy_confidence || 0,
          language_detected: mlResult.analysis.language_detected || 'unknown',
          processed_text: mlResult.analysis.processed_text || '',
          detection_details: mlResult.analysis.detection_details || [],
          detection_breakdown: mlResult.analysis.detection_breakdown || {
            exact_matches: 0,
            fuzzy_matches: 0,
            variation_matches: 0,
            lstm_seems_stuck: false
          },
          modelsUsed: {
            ...mlResult.analysis.modelsUsed,
            fuzzy_word_matching: true,
            word_variation_generation: true,
            enhanced_singlish_detection: true
          }
        }
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

  // Feedback Routes
  app.post("/api/feedback", async (req, res) => {
    try {
      const { text, feedback_type, user_annotation, original_prediction, confidence } = req.body;
      
      if (!text || !feedback_type) {
        return res.status(400).json({ message: "Text and feedback_type are required" });
      }
      
      // Forward to ML backend
      const mlResponse = await fetch('http://localhost:5003/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          feedback_type,
          user_annotation,
          original_prediction,
          confidence
        }),
      });
      
      if (!mlResponse.ok) {
        throw new Error(`ML Backend error: ${mlResponse.status}`);
      }
      
      const result = await mlResponse.json();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/feedback/stats", async (req, res) => {
    try {
      const mlResponse = await fetch('http://localhost:5003/feedback/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!mlResponse.ok) {
        throw new Error(`ML Backend error: ${mlResponse.status}`);
      }
      
      const result = await mlResponse.json();
      res.json(result);
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
      console.log('Training request received');
      
      // Check if ML backend is available
      const healthResponse = await fetch('http://localhost:5003/health');
      if (!healthResponse.ok) {
        throw new Error('ML Backend not available');
      }
      
      // Determine action based on request body
      const requestBody = req.body;
      let trainingPayload;
      
      if (requestBody.action === 'train_with_uploaded_data') {
        // Handle uploaded file
        trainingPayload = {
          action: 'train_with_uploaded_data',
          filename: requestBody.filename,
          content: requestBody.content
        };
      } else {
        // Use existing dataset
        trainingPayload = {
          action: 'train_with_existing_dataset',
          dataset_path: 'DataSets/sinhala-hate-speech-dataset.csv'
        };
      }
      
      // Trigger training
      const response = await fetch('http://localhost:5003/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trainingPayload),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ML Backend training failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      res.json({
        success: true,
        message: 'Model training completed successfully',
        result: result
      });
    } catch (error: any) {
      console.error('ML Training error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'ML training service unavailable. Please ensure the Python ML backend is running on port 5001.' 
      });
    }
  });

  app.get("/api/ml/health", async (req, res) => {
    try {
      const response = await fetch('http://localhost:5003/health');
      if (!response.ok) {
        throw new Error(`ML Backend health check failed: ${response.status}`);
      }
      const result = await response.json();
      
      // Transform the response to match frontend expectations
      const transformedResult = {
        status: result.status === 'healthy' ? 'healthy' : 'unavailable',
        message: result.message,
        detector_loaded: result.detector_loaded,
        language: result.language,
        models_supported: result.models_supported
      };
      
      res.json(transformedResult);
    } catch (error: any) {
      res.status(503).json({ 
        status: 'unavailable',
        message: 'Python ML backend not running. Start it with: python ml_backend/app.py' 
      });
    }
  });

  // Model Status Route
  app.get("/api/ml/models/status", async (req, res) => {
    try {
      const response = await fetch('http://localhost:5003/models/status');
      if (!response.ok) {
        throw new Error(`ML Backend model status check failed: ${response.status}`);
      }
      const result = await response.json();
      
      // Transform the response to match frontend expectations
      const transformedResult = {
        current_model: result.detector_type || 'enhanced_sinhala_specialized',
        available_models: {
          LSTM: { 
            loaded: result.models?.lstm_model?.status === 'loaded' || false,
            max_words: result.models?.lstm_model?.max_words,
            max_len: result.models?.lstm_model?.max_len,
            embedding_dim: result.models?.lstm_model?.embedding_dim
          },
          BERT: { 
            loaded: result.models?.mbert_model?.status === 'loaded' || false,
            model_name: result.models?.mbert_model?.model_name,
            num_classes: result.models?.mbert_model?.num_classes,
            device: result.models?.mbert_model?.device
          }
        }
      };
      
      res.json(transformedResult);
    } catch (error: any) {
      res.status(503).json({ 
        current_model: 'none',
        available_models: {
          LSTM: { loaded: false },
          BERT: { loaded: false }
        },
        error: 'ML Backend not available'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
