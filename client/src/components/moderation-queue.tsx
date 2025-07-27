import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface ModerationItem {
  id: string;
  contentId: string;
  priority: string;
  status: string;
  createdAt: string;
  content: {
    id: string;
    content: string;
    classification: string;
    confidenceScore: number;
    userId?: string;
    platform?: string;
  } | null;
}

export function ModerationQueue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: queue, isLoading } = useQuery<ModerationItem[]>({
    queryKey: ["/api/moderation-queue"],
    refetchInterval: 10000,
  });

  const approveMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiRequest("PATCH", `/api/moderation-queue/${itemId}/approve`, {});
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Content Approved",
        description: "Content has been approved and will be visible",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/moderation-queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analysis"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiRequest("PATCH", `/api/moderation-queue/${itemId}/remove`, {});
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Content Removed",
        description: "Content has been removed and hidden from users",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/moderation-queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analysis"] });
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-danger/10 text-danger";
      case "medium":
        return "bg-warning/10 text-warning";
      case "low":
        return "bg-slate-100 text-slate-600";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high":
        return "High Risk";
      case "medium":
        return "Medium Risk";
      case "low":
        return "Low Risk";
      default:
        return "Unknown";
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">Moderation Queue</h3>
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Moderation Queue</h3>
        <div className="flex items-center space-x-2">
          {queue && queue.length > 0 && (
            <Badge variant="destructive">
              {queue.length} pending
            </Badge>
          )}
          <Button variant="ghost" size="sm" className="text-primary hover:text-blue-700">
            Manage Queue
          </Button>
        </div>
      </div>
      
      <div className="space-y-4">
        {queue?.map((item) => (
          <div key={item.id} className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Badge className={getPriorityColor(item.priority)}>
                  {getPriorityLabel(item.priority)}
                </Badge>
                {item.content && (
                  <span className="text-xs text-slate-500">
                    Confidence: {item.content.confidenceScore.toFixed(1)}%
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500">
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </span>
            </div>
            
            {item.content && (
              <>
                <p className="text-sm text-slate-700 mb-3 bg-slate-50 p-3 rounded">
                  "{item.content.content}"
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    <span>@{item.content.userId || "anonymous_user"}</span> • 
                    <span className="ml-1">{item.content.platform || "Manual"}</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-success border-success hover:bg-success hover:text-white"
                      onClick={() => approveMutation.mutate(item.id)}
                      disabled={approveMutation.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeMutation.mutate(item.id)}
                      disabled={removeMutation.isPending}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
        
        {!queue?.length && (
          <div className="text-center text-slate-500 py-8">
            <p>No items in moderation queue</p>
            <p className="text-sm mt-2">Flagged content will appear here for review</p>
          </div>
        )}
      </div>
    </div>
  );
}
