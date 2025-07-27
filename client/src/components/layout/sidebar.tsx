import { Link, useLocation } from "wouter";
import { Shield, BarChart3, Search, Flag, Settings, Gauge } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export function Sidebar() {
  const [location] = useLocation();
  
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    refetchInterval: 30000,
  });

  const { data: moderationQueue } = useQuery({
    queryKey: ["/api/moderation-queue"],
    refetchInterval: 10000,
  });

  const pendingCount = moderationQueue?.length || 0;

  const navItems = [
    { path: "/", icon: Gauge, label: "Dashboard" },
    { path: "/analyzer", icon: Search, label: "Text Analyzer" },
    { 
      path: "/moderation", 
      icon: Flag, 
      label: "Moderation Queue",
      badge: pendingCount > 0 ? pendingCount : undefined
    },
    { path: "/analytics", icon: BarChart3, label: "Analytics" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-slate-200 fixed h-full z-10">
      <div className="p-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-900">ModerateAI</h1>
            <p className="text-xs text-slate-500">Sinhala Detection</p>
          </div>
        </div>
      </div>
      
      <nav className="px-3 pb-6">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                  {item.badge && (
                    <span className="ml-auto bg-danger text-white text-xs px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        
        <div className="mt-8 pt-6 border-t border-slate-200">
          <div className="px-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Model Status
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">mBERT</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-success rounded-full mr-2"></div>
                  <span className="text-xs text-slate-500">Online</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">LSTM</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-warning rounded-full mr-2"></div>
                  <span className="text-xs text-slate-500">Training</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
}
