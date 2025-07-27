import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ContentAnalysis } from "@shared/schema";

interface TextAnalyzerProps {
  onAnalysisComplete?: (analysis: ContentAnalysis) => void;
}

export function TextAnalyzer({ onAnalysisComplete }: TextAnalyzerProps) {
  const [content, setContent] = useState("");
  const [realTimeAnalysis, setRealTimeAnalysis] = useState(true);
  const [includeEncoded, setIncludeEncoded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const analyzeMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/analyze", {
        content: text,
        platform: "manual",
        userId: "admin",
      });
      return await res.json();
    },
    onSuccess: (analysis: ContentAnalysis) => {
      toast({
        title: "Analysis Complete",
        description: `Content classified as: ${analysis.classification}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/analysis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/moderation-queue"] });
      onAnalysisComplete?.(analysis);
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    if (!content.trim()) {
      toast({
        title: "Empty Content",
        description: "Please enter some text to analyze",
        variant: "destructive",
      });
      return;
    }
    analyzeMutation.mutate(content);
  };

  // Real-time analysis with debouncing
  useEffect(() => {
    if (!realTimeAnalysis || !content.trim()) return;
    
    const timeoutId = setTimeout(() => {
      if (content.length > 10) { // Only analyze if meaningful content
        analyzeMutation.mutate(content);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [content, realTimeAnalysis, analyzeMutation]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Real-time Text Analyzer</h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-success rounded-full"></div>
          <span className="text-sm text-slate-600">Model Active</span>
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Input Text (Sinhala/Singlish)
          </label>
          <Textarea
            placeholder="Enter Sinhala or Singlish text to analyze for hate speech..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="realtime"
                checked={realTimeAnalysis}
                onCheckedChange={(checked) => setRealTimeAnalysis(!!checked)}
              />
              <label htmlFor="realtime" className="text-sm text-slate-600">
                Real-time analysis
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="encoded"
                checked={includeEncoded}
                onCheckedChange={(checked) => setIncludeEncoded(!!checked)}
              />
              <label htmlFor="encoded" className="text-sm text-slate-600">
                Include encoded variations
              </label>
            </div>
          </div>
          <Button 
            onClick={handleAnalyze}
            disabled={analyzeMutation.isPending || !content.trim()}
          >
            {analyzeMutation.isPending ? "Analyzing..." : "Analyze Text"}
          </Button>
        </div>
      </div>
    </div>
  );
}
