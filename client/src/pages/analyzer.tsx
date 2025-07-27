import { useState } from "react";
import { Header } from "@/components/layout/header";
import { TextAnalyzer } from "@/components/text-analyzer";
import { DetectionResults } from "@/components/detection-results";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import type { ContentAnalysis } from "@shared/schema";

export default function Analyzer() {
  const [currentAnalysis, setCurrentAnalysis] = useState<ContentAnalysis | undefined>();
  
  const { data: recentAnalyses, isLoading } = useQuery<ContentAnalysis[]>({
    queryKey: ["/api/analysis"],
    refetchInterval: 30000,
  });

  return (
    <>
      <Header 
        title="Text Analyzer" 
        description="Analyze Sinhala/Singlish text for hate speech and harassment" 
      />
      
      <div className="p-6">
        {/* Main Analyzer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <TextAnalyzer onAnalysisComplete={setCurrentAnalysis} />
          </div>
          
          <div>
            <DetectionResults analysis={currentAnalysis} />
          </div>
        </div>

        {/* Analysis History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Analyses</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4 animate-pulse">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-20 bg-slate-200 rounded"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {recentAnalyses?.map((analysis) => (
                  <div 
                    key={analysis.id} 
                    className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 cursor-pointer"
                    onClick={() => setCurrentAnalysis(analysis)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          analysis.classification === "hate_speech" 
                            ? "bg-danger/10 text-danger"
                            : analysis.classification === "flagged"
                            ? "bg-warning/10 text-warning"
                            : "bg-success/10 text-success"
                        }`}>
                          {analysis.classification.replace("_", " ").toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-500">
                          {analysis.confidenceScore.toFixed(1)}% confidence
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(analysis.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded">
                      "{analysis.content}"
                    </p>
                  </div>
                ))}
                
                {!recentAnalyses?.length && (
                  <div className="text-center text-slate-500 py-8">
                    <p>No analyses yet</p>
                    <p className="text-sm mt-2">Start analyzing text to see history here</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
