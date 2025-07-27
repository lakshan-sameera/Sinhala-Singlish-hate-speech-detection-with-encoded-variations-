import { Header } from "@/components/layout/header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function Moderation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: queue, isLoading } = useQuery<ModerationItem[]>({
    queryKey: ["/api/moderation-queue"],
    refetchInterval: 5000,
  });

  const { data: allAnalyses } = useQuery({
    queryKey: ["/api/analysis"],
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

  const pendingQueue = queue?.filter(item => item.status === "pending") || [];
  const reviewedItems = allAnalyses?.filter((item: any) => item.isManuallyReviewed) || [];

  return (
    <>
      <Header 
        title="Moderation Queue" 
        description="Review and moderate flagged content for hate speech" 
      />
      
      <div className="p-6">
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="relative">
              Pending Review
              {pendingQueue.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingQueue.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reviewed">
              Reviewed ({reviewedItems.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Review Queue</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4 animate-pulse">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-32 bg-slate-200 rounded-lg"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {pendingQueue.map((item) => (
                      <div key={item.id} className="border border-slate-200 rounded-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <Badge className={getPriorityColor(item.priority)}>
                              {getPriorityLabel(item.priority)}
                            </Badge>
                            {item.content && (
                              <span className="text-sm text-slate-500">
                                Confidence: {item.content.confidenceScore.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-slate-500">
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        
                        {item.content && (
                          <>
                            <div className="mb-4">
                              <p className="text-sm text-slate-700 mb-2">Content:</p>
                              <p className="text-slate-800 bg-slate-50 p-4 rounded-lg border">
                                "{item.content.content}"
                              </p>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-slate-500 space-x-4">
                                <span>User: @{item.content.userId || "anonymous"}</span>
                                <span>Platform: {item.content.platform || "Manual"}</span>
                                <span>Classification: {item.content.classification}</span>
                              </div>
                              <div className="flex space-x-3">
                                <Button
                                  variant="outline"
                                  className="text-success border-success hover:bg-success hover:text-white"
                                  onClick={() => approveMutation.mutate(item.id)}
                                  disabled={approveMutation.isPending}
                                >
                                  {approveMutation.isPending ? "Approving..." : "Approve"}
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => removeMutation.mutate(item.id)}
                                  disabled={removeMutation.isPending}
                                >
                                  {removeMutation.isPending ? "Removing..." : "Remove"}
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    
                    {pendingQueue.length === 0 && (
                      <div className="text-center text-slate-500 py-12">
                        <p className="text-lg">No items pending review</p>
                        <p className="text-sm mt-2">All flagged content has been reviewed</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="reviewed" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Reviewed Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reviewedItems.map((item: any) => (
                    <div key={item.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant={item.reviewStatus === "approved" ? "default" : "destructive"}>
                            {item.reviewStatus?.toUpperCase() || "REVIEWED"}
                          </Badge>
                          <span className="text-sm text-slate-500">
                            by {item.reviewedBy || "System"}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded">
                        "{item.content}"
                      </p>
                    </div>
                  ))}
                  
                  {reviewedItems.length === 0 && (
                    <div className="text-center text-slate-500 py-8">
                      <p>No reviewed content yet</p>
                      <p className="text-sm mt-2">Reviewed items will appear here</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
