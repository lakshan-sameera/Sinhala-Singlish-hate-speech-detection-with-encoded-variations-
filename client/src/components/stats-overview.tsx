import { FileText, AlertTriangle, EyeOff, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { SystemStats } from "@shared/schema";

export function StatsOverview() {
  const { data: stats, isLoading } = useQuery<SystemStats>({
    queryKey: ["/api/stats"],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-pulse">
            <div className="h-20 bg-slate-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Analyzed",
      value: stats?.totalAnalyzed.toLocaleString() || "0",
      icon: FileText,
      iconBg: "bg-blue-100",
      iconColor: "text-primary",
      change: "+12.5%",
      changeType: "positive" as const,
    },
    {
      title: "Hate Speech Detected",
      value: stats?.hateDetected.toLocaleString() || "0",
      icon: AlertTriangle,
      iconBg: "bg-red-100",
      iconColor: "text-danger",
      change: "+3.2%",
      changeType: "negative" as const,
    },
    {
      title: "Auto-Hidden",
      value: stats?.autoHidden.toLocaleString() || "0",
      icon: EyeOff,
      iconBg: "bg-amber-100",
      iconColor: "text-warning",
      change: "-2.1%",
      changeType: "positive" as const,
    },
    {
      title: "Accuracy Rate",
      value: `${stats?.accuracyRate.toFixed(1) || "0"}%`,
      icon: CheckCircle,
      iconBg: "bg-emerald-100",
      iconColor: "text-success",
      change: "+0.5%",
      changeType: "positive" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((card) => {
        const Icon = card.icon;
        
        return (
          <div key={card.title} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">{card.title}</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{card.value}</p>
              </div>
              <div className={`w-12 h-12 ${card.iconBg} rounded-xl flex items-center justify-center`}>
                <Icon className={`${card.iconColor} w-5 h-5`} />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <span className={`text-sm font-medium ${
                card.changeType === "positive" ? "text-success" : "text-danger"
              }`}>
                {card.change}
              </span>
              <span className="text-slate-500 text-sm ml-2">from last week</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
