import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Shield, 
  Brain, 
  Languages, 
  Target,
  Zap,
  Eye,
  BarChart3,
  Globe,
  Cpu,
  MessageSquare,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FeedbackForm } from "./feedback-form";

// Clean interface matching actual API response
interface AnalysisResult {
  id: string;
  content: string;
  classification: 'safe' | 'flagged' | 'hate_speech';
  confidenceScore: number;
  hateScore: number;
  harassmentScore: number;
  normalScore: number;
  isAutoHidden: boolean;
  isManuallyReviewed: boolean;
  reviewStatus: string | null;
  reviewedBy: string | null;
  platform: string;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  neutralizedText: string;
  isHateSpeech: boolean;
  probabilities: {
    NOT: number;
    OFF: number;
  };
  analysis: {
    hateScore: number;
    hateWordsFound: string[];
    hateWordCount: number;
    sinhalaRatio: number;
    hasObfuscation: boolean;
    obfuscationScore: number;
    // Enhanced ML detection features
    hate_score?: number;
    hate_words_found?: string[];
    hate_word_count?: number;
    sinhala_ratio?: number;
    language_detected?: string;
    lstm_contribution?: number;
    processed_text?: string;
    detection_details?: Array<{
      word: string;
      matched_text: string;
      match_type: 'exact' | 'fuzzy' | 'variation';
      similarity: number;
    }>;
    detection_breakdown?: {
      exact_matches: number;
      fuzzy_matches: number;
      variation_matches: number;
      lstm_seems_stuck: boolean;
    };
    modelsUsed: {
      lstm: boolean;
      mbert: boolean;
      academic_preprocessing: boolean;
      // Enhanced model features
      fuzzy_word_matching?: boolean;
      word_variation_generation?: boolean;
      enhanced_singlish_detection?: boolean;
    };
    fuzzy_matching_enabled?: boolean;
  };
}

interface ModelStatus {
  current_model: string;
  available_models: {
    LSTM: {
      loaded: boolean;
      status: string;
      max_words: number;
      max_len: number;
      embedding_dim: number;
      accuracy: string;
    };
  };
}

export function TextAnalyzer() {
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [isModelHealthy, setIsModelHealthy] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const { toast } = useToast();

  const API_BASE_URL = 'http://localhost:5000';

  useEffect(() => {
    checkModelHealth();
    fetchModelStatus();
  }, []);

  const checkModelHealth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ml/health`);
      if (response.ok) {
        const health = await response.json();
        setIsModelHealthy(health.status === 'healthy');
      } else {
        setIsModelHealthy(false);
      }
    } catch (error) {
      setIsModelHealthy(false);
    }
  };

  const fetchModelStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ml/models/status`);
      if (response.ok) {
        const status = await response.json();
        setModelStatus(status);
      }
    } catch (error) {
      console.error('Failed to fetch model status:', error);
    }
  };

  const analyzeText = async () => {
    if (!text.trim()) {
      toast({
        title: "Empty Text",
        description: "Please enter some text to analyze.",
        variant: "destructive",
      });
      return;
    }

    if (!isModelHealthy) {
      toast({
        title: "Model Not Available",
        description: "The enhanced LSTM model is not loaded. Please ensure the backend is running.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: text.trim() }),
      });

      if (response.ok) {
        const analysisResult = await response.json();
        setResult(analysisResult);
        
        // Enhanced success message with intelligent detection info
        const confidence = analysisResult.confidenceScore || 0;
        const classification = analysisResult.classification;
        const lstmConfidence = analysisResult.analysis?.lstm_contribution || 0;
        
        let description = `🧠 Intelligent Analysis: ${classification === 'hate_speech' ? 'Hate Speech' : classification === 'flagged' ? 'Flagged' : 'Safe'} (${confidence}% confidence)`;
        
        // Show LSTM intelligence
        if (lstmConfidence > 0.6) {
          description += ` | LSTM Intelligence: ${(lstmConfidence * 100).toFixed(1)}%`;
        }
        
        // Show detected words count
        const detectedWords = analysisResult.analysis?.hate_words_found?.length || 0;
        if (detectedWords > 0) {
          description += ` | 🎯 ${detectedWords} word(s) intelligently detected`;
        } else if (lstmConfidence > 0.5) {
          description += ` | 🧠 Pattern-based detection (no specific words)`;
        }
        
        toast({
          title: "Analysis Complete",
          description: description,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Analysis Failed",
          description: error.message || "Failed to analyze text",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Failed to connect to the analysis service.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getPredictionColor = (prediction: string) => {
    return prediction === 'OFF' ? 'destructive' : 'default';
  };

  const getPredictionIcon = (prediction: string) => {
    return prediction === 'OFF' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />;
  };

  const getLanguageIcon = (language: string) => {
    switch (language) {
      case 'sinhala': return <Globe className="w-4 h-4" />;
      case 'english': return <Languages className="w-4 h-4" />;
      case 'mixed': return <Zap className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Main Analysis Card */}
      <Card className="border-2 border-blue-100 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                Enhanced Hate Speech Detection
              </CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                🧠 Intelligent LSTM-First Detection + Context Analysis + Pattern Recognition for Sinhala/Singlish
              </CardDescription>
            </div>
            <Badge 
              variant={isModelHealthy ? "default" : "destructive"} 
              className="flex items-center gap-2 px-3 py-2"
            >
              {isModelHealthy ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {isModelHealthy ? "Model Ready" : "Model Offline"}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6 p-6">
          {/* Model Information */}
          {modelStatus && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-green-800">AI Model Status</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">Model:</span>
                  <span className="text-blue-700">{modelStatus.current_model}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-600" />
                  <span className="font-medium">Accuracy:</span>
                  <span className="text-purple-700">{modelStatus.available_models.LSTM.accuracy}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-orange-600" />
                  <span className="font-medium">Status:</span>
                  <span className="text-orange-700">{modelStatus.available_models.LSTM.status}</span>
                </div>
              </div>
            </div>
          )}

          {/* Text Input */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label htmlFor="text-input" className="text-sm font-semibold text-gray-700">
                Enter Text to Analyze
              </label>
              <Badge variant="outline" className="text-xs">
                Supports: Sinhala, Singlish, Encoded Text
              </Badge>
            </div>
            <Textarea
              id="text-input"
              placeholder="Enter Sinhala, Singlish, or mixed text here... Try variations like 'hutto', 'pako', 'hutttta' to see enhanced detection!"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[120px] text-base border-2 focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
              disabled={!isModelHealthy}
            />
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              🎯 Enhanced AI now detects word variations: "hutta"→"hutto", "paka"→"pako", character repetitions, and obfuscated text!
            </div>
          </div>

          {/* Analyze Button */}
          <Button 
            onClick={analyzeText}
            disabled={!isModelHealthy || isAnalyzing || !text.trim()}
            className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                Analyzing Text...
              </>
            ) : (
              <>
                <Shield className="mr-3 h-5 w-5" />
                Analyze Text
              </>
            )}
          </Button>

          {/* Model Health Warning */}
          {!isModelHealthy && (
            <Alert variant="destructive" className="border-2 border-red-300 bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="font-semibold mb-1">⚠️ AI Model Not Available</div>
                <div className="text-sm">
                  Please ensure the Python ML backend is running on port 5003 and the enhanced LSTM model is loaded.
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results Display */}
      {result && (
        <Card className="border-2 border-green-100 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                  Analysis Results
                </CardTitle>
                <CardDescription className="text-gray-600 mt-2">
                  AI-powered hate speech detection with confidence scoring
                </CardDescription>
              </div>
              <Badge 
                variant={getPredictionColor(result.classification)} 
                className="flex items-center gap-2 px-4 py-2 text-lg font-semibold"
              >
                {getPredictionIcon(result.classification)}
                {result.classification === 'hate_speech' ? 'HATE SPEECH' : result.classification === 'flagged' ? 'FLAGGED' : 'SAFE'}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6 p-6">
            {/* Main Prediction */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-bold text-blue-800">AI Model Prediction</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Model Confidence</span>
                    <span className="text-2xl font-bold text-blue-600">{result.confidenceScore.toFixed(1)}%</span>
                  </div>
                  <Progress value={result.confidenceScore} className="h-3" />
                  <p className="text-xs text-gray-500">How confident the AI model is in its prediction</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Hate Speech Likelihood</span>
                    <span className="text-2xl font-bold text-red-600">{(result.probabilities.OFF * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={result.probabilities.OFF * 100} className="h-3 bg-red-100" />
                  <p className="text-xs text-gray-500">Probability that the text contains hate speech</p>
                </div>
              </div>
            </div>

            {/* Detailed Analysis */}
            {/* Results Explanation */}
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-5 h-5 text-yellow-600" />
                <h3 className="text-lg font-semibold text-yellow-800">Understanding Your Results</h3>
              </div>
              <div className="text-sm text-yellow-700 space-y-1">
                <p><strong>Classification:</strong> {result.classification === 'safe' ? '✅ Safe content' : result.classification === 'flagged' ? '⚠️ Content flagged for review' : '🚨 Hate speech detected'}</p>
                <p><strong>Hate Words:</strong> {result.analysis.hateWordCount > 0 ? `Found ${result.analysis.hateWordCount} hate word(s)` : 'No hate words detected'}</p>
                <p><strong>AI Confidence:</strong> {result.confidenceScore > 80 ? 'High confidence' : result.confidenceScore > 60 ? 'Medium confidence' : 'Low confidence'} ({result.confidenceScore.toFixed(1)}%)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                <div className="text-3xl font-bold text-red-600 mb-2">{(result.analysis.hateScore * 100).toFixed(0)}%</div>
                <div className="text-sm text-gray-600">Hate Score</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">{result.analysis.hateWordCount}</div>
                <div className="text-sm text-gray-600">Hate Words</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">{(result.analysis.sinhalaRatio * 100).toFixed(0)}%</div>
                <div className="text-sm text-gray-600">Sinhala Content</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Globe className="w-4 h-4" />
                  <span className="text-lg font-bold text-purple-600 capitalize">Mixed</span>
                </div>
                <div className="text-sm text-gray-600">Language</div>
              </div>
            </div>

            {/* Hate Words Found */}
            {result.analysis.hateWordsFound.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-semibold text-red-800">Detected Hate Words</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.analysis.hateWordsFound.map((word, index) => (
                    <Badge key={index} variant="destructive" className="text-sm px-3 py-1 bg-red-100 text-red-800 border-red-300">
                      ⚠️ {word}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-red-600 mt-2">
                  {result.analysis.hateWordCount} hate word{result.analysis.hateWordCount > 1 ? 's' : ''} detected in the text.
                </p>
              </div>
            )}

            {/* Model Information */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-800">Model Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${result.analysis.modelsUsed.lstm ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-sm font-medium">LSTM Model</span>
                  <span className="text-xs text-gray-600">({result.analysis.modelsUsed.lstm ? 'Active' : 'Inactive'})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${result.analysis.modelsUsed.mbert ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-sm font-medium">mBERT Model</span>
                  <span className="text-xs text-gray-600">({result.analysis.modelsUsed.mbert ? 'Active' : 'Inactive'})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${result.analysis.modelsUsed.academic_preprocessing ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-sm font-medium">Academic Preprocessing</span>
                  <span className="text-xs text-gray-600">({result.analysis.modelsUsed.academic_preprocessing ? 'Active' : 'Inactive'})</span>
                </div>
              </div>
            </div>

            {/* Probability Breakdown */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-purple-800">Probability Breakdown</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Safe Content</span>
                    <span className="text-lg font-bold text-green-600">{(result.probabilities.NOT * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={result.probabilities.NOT * 100} className="h-2 bg-green-100" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Hate Speech</span>
                    <span className="text-lg font-bold text-red-600">{(result.probabilities.OFF * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={result.probabilities.OFF * 100} className="h-2 bg-red-100" />
                </div>
              </div>
            </div>

            {/* Enhanced ML Detection Features */}
            {result.analysis.detection_details && result.analysis.detection_details.length > 0 && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-6 border border-emerald-200">
                <div className="flex items-center gap-3 mb-4">
                  <Target className="w-6 h-6 text-emerald-600" />
                  <h3 className="text-xl font-bold text-emerald-800">🎯 Enhanced Detection Results</h3>
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300">
                    ✨ NEW FEATURES
                  </Badge>
                </div>
                
                {/* Detection Breakdown */}
                {result.analysis.detection_breakdown && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4 border border-emerald-200 text-center">
                      <div className="text-2xl font-bold text-emerald-600 mb-1">{result.analysis.detection_breakdown.exact_matches}</div>
                      <div className="text-xs text-gray-600">Exact Matches</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-emerald-200 text-center">
                      <div className="text-2xl font-bold text-blue-600 mb-1">{result.analysis.detection_breakdown.fuzzy_matches}</div>
                      <div className="text-xs text-gray-600">Fuzzy Matches</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-emerald-200 text-center">
                      <div className="text-2xl font-bold text-purple-600 mb-1">{result.analysis.detection_breakdown.variation_matches}</div>
                      <div className="text-xs text-gray-600">Variations</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-emerald-200 text-center">
                      <div className="text-lg font-bold text-orange-600 mb-1">
                        {result.analysis.lstm_contribution ? (result.analysis.lstm_contribution * 100).toFixed(1) + '%' : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-600">LSTM Score</div>
                    </div>
                  </div>
                )}
                
                {/* Detailed Detection Matches */}
                <div className="space-y-3">
                  <h4 className="text-lg font-semibold text-emerald-800 flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Word Detection Details
                  </h4>
                  <div className="space-y-2">
                    {result.analysis.detection_details.map((detail, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-emerald-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant={detail.match_type === 'exact' ? 'default' : detail.match_type === 'fuzzy' ? 'secondary' : 'outline'}
                            className={`text-xs ${
                              detail.match_type === 'exact' ? 'bg-green-100 text-green-800' :
                              detail.match_type === 'fuzzy' ? 'bg-blue-100 text-blue-800' :
                              'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {detail.match_type.toUpperCase()}
                          </Badge>
                          <span className="font-medium text-gray-800">{detail.word}</span>
                          {detail.matched_text && detail.matched_text !== detail.word && (
                            <span className="text-sm text-gray-600">→ "{detail.matched_text}"</span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-emerald-600">{(detail.similarity * 100).toFixed(1)}%</div>
                          <div className="text-xs text-gray-500">similarity</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Enhanced Processing Info */}
                {result.analysis.processed_text && result.analysis.processed_text !== result.content && (
                  <div className="mt-4 bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                      <Cpu className="w-4 h-4" />
                      Text Processing Applied
                    </h4>
                    <div className="text-sm">
                      <div className="text-gray-600">Original: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{result.content}</span></div>
                      <div className="text-gray-600 mt-1">Processed: <span className="font-mono bg-blue-100 px-2 py-1 rounded">{result.analysis.processed_text}</span></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Enhanced Model Features */}
            {result.analysis.modelsUsed.fuzzy_word_matching && (
              <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg p-6 border border-violet-200">
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="w-6 h-6 text-violet-600" />
                  <h3 className="text-xl font-bold text-violet-800">🧠 Advanced AI Features</h3>
                  <Badge variant="outline" className="bg-violet-100 text-violet-700 border-violet-300">
                    ⚡ ENHANCED
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-violet-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-3 h-3 rounded-full ${result.analysis.modelsUsed.fuzzy_word_matching ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      <span className="text-sm font-semibold">Fuzzy Matching</span>
                    </div>
                    <p className="text-xs text-gray-600">Detects word variations like "hutta" → "hutto"</p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-violet-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-3 h-3 rounded-full ${result.analysis.modelsUsed.word_variation_generation ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      <span className="text-sm font-semibold">Word Variations</span>
                    </div>
                    <p className="text-xs text-gray-600">Generates and matches common Singlish patterns</p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-violet-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-3 h-3 rounded-full ${result.analysis.modelsUsed.enhanced_singlish_detection ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      <span className="text-sm font-semibold">Singlish Detection</span>
                    </div>
                    <p className="text-xs text-gray-600">Enhanced processing for Sinhala/English mix</p>
                  </div>
                </div>
                
                {/* Language Analysis */}
                {result.analysis.language_detected && (
                  <div className="mt-4 bg-white rounded-lg p-4 border border-violet-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getLanguageIcon(result.analysis.language_detected)}
                        <span className="font-semibold">Language: </span>
                        <span className="capitalize">{result.analysis.language_detected}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-violet-600">
                          {result.analysis.sinhala_ratio ? (result.analysis.sinhala_ratio * 100).toFixed(1) + '%' : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">Sinhala Content</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* LSTM Status Warning */}
            {result.analysis.detection_breakdown?.lstm_seems_stuck && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <h4 className="text-lg font-semibold text-yellow-800">LSTM Model Notice</h4>
                </div>
                <p className="text-sm text-yellow-700">
                  The LSTM model seems to be giving consistent predictions. Detection is primarily based on enhanced 
                  hate word matching with fuzzy detection and word variations.
                </p>
              </div>
            )}

            {/* Feedback Button */}
            <div className="flex justify-center pt-4">
              <Button
                onClick={() => setShowFeedback(true)}
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Report Model Error
              </Button>
            </div>

            <div className="text-center text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
              📅 Analysis completed at {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback Form Modal */}
      {showFeedback && result && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full">
            <FeedbackForm
              originalText={result.content}
              originalPrediction={result.classification}
              originalConfidence={result.confidenceScore}
              onClose={() => setShowFeedback(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
