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
