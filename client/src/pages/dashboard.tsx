import { useState } from "react";
import { Header } from "@/components/layout/header";
import { StatsOverview } from "@/components/stats-overview";
import { TextAnalyzer } from "@/components/text-analyzer";
import { DetectionResults } from "@/components/detection-results";
import { RecentActivity } from "@/components/recent-activity";
import { ModerationQueue } from "@/components/moderation-queue";
import type { ContentAnalysis } from "@shared/schema";

export default function Dashboard() {
  const [currentAnalysis, setCurrentAnalysis] = useState<ContentAnalysis | undefined>();

  return (
    <>
      <Header 
        title="Dashboard" 
        description="Monitor and analyze Sinhala content for hate speech detection" 
      />
      
      <div className="p-6">
        <StatsOverview />
        
        {/* Real-time Analyzer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <TextAnalyzer onAnalysisComplete={setCurrentAnalysis} />
          </div>
          
          <div>
            <DetectionResults analysis={currentAnalysis} />
          </div>
        </div>

        {/* Recent Activity & Moderation Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentActivity />
          <ModerationQueue />
        </div>
      </div>
    </>
  );
}
