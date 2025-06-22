import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Clock, Calendar, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncStatus {
  google: {
    connected: boolean;
    service: string;
  };
  outlook: {
    connected: boolean;
    service: string;
  };
  lastSync: string;
}

export function Sidebar() {
  const [location] = useLocation();
  
  const { data: syncStatus } = useQuery<SyncStatus>({
    queryKey: ["/api/sync/status"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatLastSync = (lastSync: string) => {
    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  };

  return (
    <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
      <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
              <CheckCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="ml-3 text-xl font-semibold text-gray-900">TaskSync</span>
          </div>
        </div>
        
        <nav className="mt-8 flex-1 px-2 space-y-1">
          <Link href="/">
            <a className={cn(
              "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
              location === "/" 
                ? "bg-primary/10 text-primary" 
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}>
              <CheckCircle className={cn(
                "mr-3 h-5 w-5",
                location === "/" ? "text-primary" : "text-gray-400"
              )} />
              All Tasks
            </a>
          </Link>
          <Link href="/today">
            <a className={cn(
              "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
              location === "/today" 
                ? "bg-primary/10 text-primary" 
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}>
              <Clock className={cn(
                "mr-3 h-5 w-5",
                location === "/today" ? "text-primary" : "text-gray-400"
              )} />
              Today
            </a>
          </Link>
          <Link href="/upcoming">
            <a className={cn(
              "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
              location === "/upcoming" 
                ? "bg-primary/10 text-primary" 
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}>
              <Calendar className={cn(
                "mr-3 h-5 w-5",
                location === "/upcoming" ? "text-primary" : "text-gray-400"
              )} />
              Upcoming
            </a>
          </Link>
        </nav>

        <div className="flex-shrink-0 px-4 pb-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Calendar Sync</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={cn(
                    "w-3 h-3 rounded-full mr-2",
                    syncStatus?.google.connected ? "bg-green-500" : "bg-red-500"
                  )}></div>
                  <span className="text-sm text-gray-600">Google Calendar</span>
                </div>
                <span className={cn(
                  "text-xs font-medium",
                  syncStatus?.google.connected ? "text-green-600" : "text-red-600"
                )}>
                  {syncStatus?.google.connected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={cn(
                    "w-3 h-3 rounded-full mr-2",
                    syncStatus?.outlook.connected ? "bg-green-500" : "bg-red-500"
                  )}></div>
                  <span className="text-sm text-gray-600">Outlook Calendar</span>
                </div>
                <span className={cn(
                  "text-xs font-medium",
                  syncStatus?.outlook.connected ? "text-green-600" : "text-red-600"
                )}>
                  {syncStatus?.outlook.connected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
            {syncStatus && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  Last sync: {formatLastSync(syncStatus.lastSync)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
