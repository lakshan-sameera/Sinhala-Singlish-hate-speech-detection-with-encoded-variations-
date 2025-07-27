import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import type { ContentAnalysis } from "@shared/schema";

export function RecentActivity() {
  const { data: activities, isLoading } = useQuery<ContentAnalysis[]>({
    queryKey: ["/api/analysis"],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">Recent Activity</h3>
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const getActivityColor = (classification: string) => {
    switch (classification) {
      case "hate_speech":
        return "bg-danger";
      case "flagged":
        return "bg-warning";
      case "safe":
        return "bg-success";
      default:
        return "bg-slate-400";
    }
  };

  const getActivityAction = (analysis: ContentAnalysis) => {
    if (analysis.classification === "hate_speech") {
      return "Hate speech detected";
    } else if (analysis.classification === "flagged") {
      return "Content flagged";
    } else if (analysis.reviewStatus === "approved") {
      return "Content approved";
    } else {
      return "Content analyzed";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
        <Button variant="ghost" size="sm" className="text-primary hover:text-blue-700">
          View All
        </Button>
      </div>
      
      <div className="space-y-4">
        {activities?.slice(0, 5).map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3">
            <div className={`w-2 h-2 ${getActivityColor(activity.classification)} rounded-full mt-2 flex-shrink-0`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-900">
                <span className="font-medium">{getActivityAction(activity)}</span>
                {activity.userId && (
                  <>
                    {" "}by <span className="font-medium">@{activity.userId}</span>
                  </>
                )}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </p>
              <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2 rounded max-w-md truncate">
                "{activity.content}"
              </p>
            </div>
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700">
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        ))}
        
        {!activities?.length && (
          <div className="text-center text-slate-500 py-8">
            <p>No recent activity</p>
            <p className="text-sm mt-2">Activity will appear here as content is analyzed</p>
          </div>
        )}
      </div>
    </div>
  );
}
