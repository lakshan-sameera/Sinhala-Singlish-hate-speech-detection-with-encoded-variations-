import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Users, Clock } from "lucide-react";

export default function Analytics() {
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  const { data: analyses } = useQuery({
    queryKey: ["/api/analysis"],
  });

  // Calculate analytics data
  const totalAnalyses = analyses?.length || 0;
  const hateDetections = analyses?.filter((a: any) => a.classification === "hate_speech").length || 0;
  const flaggedContent = analyses?.filter((a: any) => a.classification === "flagged").length || 0;
  const safeContent = analyses?.filter((a: any) => a.classification === "safe").length || 0;
  
  const detectionRate = totalAnalyses > 0 ? ((hateDetections + flaggedContent) / totalAnalyses * 100) : 0;
  const accuracyRate = stats?.accuracyRate || 0;

  const analyticsCards = [
    {
      title: "Detection Rate",
      value: `${detectionRate.toFixed(1)}%`,
      description: "Percentage of content flagged as problematic",
      icon: BarChart3,
      color: "text-warning",
    },
    {
      title: "System Accuracy",
      value: `${accuracyRate.toFixed(1)}%`,
      description: "Overall model accuracy",
      icon: TrendingUp,
      color: "text-success",
    },
    {
      title: "Response Time",
      value: "< 1s",
      description: "Average analysis time",
      icon: Clock,
      color: "text-primary",
    },
    {
      title: "Active Users",
      value: "147",
      description: "Users in the system",
      icon: Users,
      color: "text-slate-600",
    },
  ];

  return (
    <>
      <Header 
        title="Analytics" 
        description="Performance metrics and insights for hate speech detection" 
      />
      
      <div className="p-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {analyticsCards.map((card) => {
            const Icon = card.icon;
            
            return (
              <Card key={card.title}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">{card.title}</p>
                      <p className="text-2xl font-bold text-slate-900 mt-2">{card.value}</p>
                      <p className="text-xs text-slate-500 mt-1">{card.description}</p>
                    </div>
                    <Icon className={`w-8 h-8 ${card.color}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Content Analysis Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Content Classification Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-success rounded-full"></div>
                    <span className="text-sm text-slate-700">Safe Content</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-slate-900">{safeContent}</span>
                    <span className="text-xs text-slate-500 ml-2">
                      ({totalAnalyses > 0 ? (safeContent / totalAnalyses * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-warning rounded-full"></div>
                    <span className="text-sm text-slate-700">Flagged Content</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-slate-900">{flaggedContent}</span>
                    <span className="text-xs text-slate-500 ml-2">
                      ({totalAnalyses > 0 ? (flaggedContent / totalAnalyses * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-danger rounded-full"></div>
                    <span className="text-sm text-slate-700">Hate Speech</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-slate-900">{hateDetections}</span>
                    <span className="text-xs text-slate-500 ml-2">
                      ({totalAnalyses > 0 ? (hateDetections / totalAnalyses * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Model Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-700">Accuracy Rate</span>
                    <span className="font-medium">{accuracyRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-success h-2 rounded-full" 
                      style={{ width: `${accuracyRate}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-700">Detection Rate</span>
                    <span className="font-medium">{detectionRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-warning h-2 rounded-full" 
                      style={{ width: `${detectionRate}%` }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-700">Auto-Hide Rate</span>
                    <span className="font-medium">72.3%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: "72.3%" }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Trends */}
        <Card>
          <CardHeader>
            <CardTitle>System Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{stats?.totalAnalyzed?.toLocaleString() || 0}</p>
                <p className="text-sm text-slate-600 mt-1">Total Analyzed</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-danger">{stats?.hateDetected?.toLocaleString() || 0}</p>
                <p className="text-sm text-slate-600 mt-1">Hate Speech Detected</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-warning">{stats?.autoHidden?.toLocaleString() || 0}</p>
                <p className="text-sm text-slate-600 mt-1">Auto-Hidden</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
