import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ContentAnalysis } from "@shared/schema";

interface DetectionResultsProps {
  analysis?: ContentAnalysis;
}

export function DetectionResults({ analysis }: DetectionResultsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const hideContentMutation = useMutation({
    mutationFn: async (analysisId: string) => {
      const res = await apiRequest("PATCH", `/api/analysis/${analysisId}`, {
        isAutoHidden: true,
        reviewStatus: "removed",
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Content Hidden",
        description: "Content has been auto-hidden successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/analysis"] });
    },
  });

  const flagForReviewMutation = useMutation({
    mutationFn: async (analysisId: string) => {
      const res = await apiRequest("POST", "/api/moderation-queue", {
        contentId: analysisId,
        priority: "high",
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Content Flagged",
        description: "Content has been flagged for manual review",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/moderation-queue"] });
    },
  });

  if (!analysis) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Detection Results</h3>
        <div className="text-center text-slate-500 py-8">
          <p>No analysis results yet.</p>
          <p className="text-sm mt-2">Enter text to see detection results.</p>
        </div>
      </div>
    );
  }

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case "hate_speech":
        return "bg-danger/10 text-danger";
      case "flagged":
        return "bg-warning/10 text-warning";
      case "safe":
        return "bg-success/10 text-success";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const getClassificationLabel = (classification: string) => {
    switch (classification) {
      case "hate_speech":
        return "Hate Speech";
      case "flagged":
        return "Flagged";
      case "safe":
        return "Safe";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Detection Results</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Overall Classification</span>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getClassificationColor(analysis.classification)}`}>
            {getClassificationLabel(analysis.classification)}
          </span>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Confidence Score</span>
            <span className="text-sm font-bold text-slate-900">
              {analysis.confidenceScore.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div 
              className="bg-warning h-2 rounded-full transition-all duration-300" 
              style={{ width: `${analysis.confidenceScore}%` }}
            />
          </div>
        </div>
        
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-700">Detection Breakdown</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Hate Speech</span>
              <span className="text-sm font-medium text-danger">
                {analysis.hateScore.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Harassment</span>
              <span className="text-sm font-medium text-warning">
                {analysis.harassmentScore.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Normal</span>
              <span className="text-sm font-medium text-success">
                {analysis.normalScore.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
        
                    {/* Intelligent Word Detection Analysis */}
            {(analysis as any).analysis && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-700">🧠 Intelligent Word Detection</h4>
                
                {/* LSTM Intelligence */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">LSTM Intelligence</span>
                    <span className="text-sm font-medium text-blue-600">
                      {((analysis as any).analysis.lstm_contribution * 100 || 0).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Context Analysis</span>
                    <span className="text-sm font-medium text-purple-600">
                      {((analysis as any).analysis.fuzzy_confidence * 100 || 0).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Language Detected</span>
                    <span className="text-sm font-medium text-green-600 capitalize">
                      {(analysis as any).analysis.language_detected || 'unknown'}
                    </span>
                  </div>
                </div>
                
                {/* Intelligent Word Detection Results */}
                {(analysis as any).analysis.hate_words_found && (analysis as any).analysis.hate_words_found.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-slate-600">🎯 Intelligently Detected Words</h5>
                    <div className="space-y-1">
                      {(analysis as any).analysis.hate_words_found.map((wordInfo: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                              {wordInfo.word}
                            </span>
                            <span className="text-xs text-slate-500">
                              {wordInfo.match_type === 'intelligent' ? '🧠 AI Detected' : 
                               wordInfo.match_type === 'exact' ? '📝 Exact Match' : '🔍 Pattern Match'}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-slate-600">
                            {(wordInfo.similarity * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* No Words Detected - Show LSTM Intelligence */}
                {(!(analysis as any).analysis.hate_words_found || (analysis as any).analysis.hate_words_found.length === 0) && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-slate-600">🧠 LSTM Intelligence</h5>
                    <div className="p-3 bg-blue-50 rounded border border-blue-200">
                      <p className="text-xs text-blue-800">
                        No specific hate words detected, but LSTM model identified patterns suggesting hate speech with {((analysis as any).analysis.lstm_contribution * 100 || 0).toFixed(1)}% confidence.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Detection Method */}
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-slate-600">🔍 Detection Method</h5>
                  <div className="p-2 bg-slate-50 rounded">
                    <p className="text-xs text-slate-700">
                      {(analysis as any).analysis.detection_method || 'LSTM-First Intelligent Analysis'}
                    </p>
                  </div>
                </div>
              </div>
            )}
        
        {/* Original ML Model Probabilities */}
        {(analysis as any).probabilities && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-700">LSTM Probabilities</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">NOT (Safe)</span>
                <span className="text-sm font-medium text-success">
                  {((analysis as any).probabilities.NOT * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">OFF (Hate)</span>
                <span className="text-sm font-medium text-danger">
                  {((analysis as any).probabilities.OFF * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div className="pt-4 border-t border-slate-200">
          <div className="flex space-x-2">
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => hideContentMutation.mutate(analysis.id)}
              disabled={hideContentMutation.isPending}
            >
              Auto-Hide
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => flagForReviewMutation.mutate(analysis.id)}
              disabled={flagForReviewMutation.isPending}
            >
              Flag for Review
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
