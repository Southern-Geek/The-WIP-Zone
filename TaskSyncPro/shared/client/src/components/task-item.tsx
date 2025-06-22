import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, AlertCircle, RefreshCw, Bell, Repeat, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDate, isOverdue, cn } from "@/lib/utils";
import type { Task } from "@shared/schema";

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
}

export function TaskItem({ task, onEdit }: TaskItemProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateTaskMutation = useMutation({
    mutationFn: async (updates: Partial<Task>) => {
      const res = await apiRequest("PATCH", `/api/tasks/${task.id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update task: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/tasks/${task.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete task: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const retrySyncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/tasks/${task.id}/sync`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Sync initiated",
        description: "Task sync has been started",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to retry sync: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleToggleComplete = (checked: boolean) => {
    updateTaskMutation.mutate({ completed: checked });
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      deleteTaskMutation.mutate();
    }
  };

  const handleRetrySync = () => {
    retrySyncMutation.mutate();
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "🔴";
      case "high":
        return "🟠";
      case "medium":
        return "🟡";
      case "low":
        return "🟢";
      default:
        return "🟡";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "border-red-200 bg-red-50";
      case "high":
        return "border-orange-200 bg-orange-50";
      case "medium":
        return "border-yellow-200 bg-yellow-50";
      case "low":
        return "border-green-200 bg-green-50";
      default:
        return "border-gray-200 bg-white";
    }
  };

  const getSyncStatusIcon = () => {
    switch (task.syncStatus) {
      case "synced":
        return (
          <div className="flex items-center space-x-2">
            <div className="flex items-center text-xs text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
              Google Cal
            </div>
            <div className="flex items-center text-xs text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
              Outlook
            </div>
          </div>
        );
      case "syncing":
        return (
          <div className="flex items-center text-xs text-yellow-600">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1 animate-pulse"></div>
            Syncing...
          </div>
        );
      case "failed":
        return (
          <div className="flex items-center space-x-2">
            <div className="flex items-center text-xs text-red-600">
              <AlertCircle className="w-3 h-3 mr-1" />
              Sync failed
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary hover:text-primary-foreground h-auto p-1"
              onClick={handleRetrySync}
              disabled={retrySyncMutation.isPending}
            >
              {retrySyncMutation.isPending ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                "Retry"
              )}
            </Button>
          </div>
        );
      default:
        return (
          <div className="flex items-center text-xs text-gray-500">
            <div className="w-2 h-2 bg-gray-400 rounded-full mr-1"></div>
            Pending
          </div>
        );
    }
  };

  return (
    <div className={cn(
      "rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow duration-200",
      task.syncStatus === "failed" ? "border-red-200" : getPriorityColor(task.priority),
      task.completed && "opacity-75"
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-start flex-1">
          <Checkbox
            checked={task.completed}
            onCheckedChange={handleToggleComplete}
            disabled={updateTaskMutation.isPending}
            className="mt-1"
          />
          <div className="ml-3 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={cn(
                "text-sm font-medium text-gray-900",
                task.completed && "line-through"
              )}>
                {task.title}
              </h3>
              <span className="text-sm">{getPriorityIcon(task.priority)}</span>
              {task.isRecurring && (
                <Badge variant="outline" className="text-xs">
                  <Repeat className="w-3 h-3 mr-1" />
                  {task.recurringPattern}
                </Badge>
              )}
            </div>
            
            {task.description && (
              <p className={cn(
                "text-sm text-gray-600 mt-1",
                task.completed && "line-through"
              )}>
                {task.description}
              </p>
            )}

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {task.category}
              </Badge>
              
              {task.labels.map((label, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {label}
                </Badge>
              ))}
            </div>
            
            <div className="flex items-center mt-2 space-x-4 flex-wrap">
              {task.dueDate && (
                <span className={cn(
                  "text-xs flex items-center",
                  task.completed 
                    ? "text-gray-500 line-through" 
                    : isOverdue(task.dueDate) 
                      ? "text-red-600" 
                      : "text-gray-500"
                )}>
                  <Calendar className="w-4 h-4 mr-1" />
                  {task.completed 
                    ? `Completed ${formatDate(task.updatedAt)}`
                    : `Due ${formatDate(task.dueDate)}`
                  }
                </span>
              )}

              {task.reminderMinutes && (
                <span className="text-xs flex items-center text-blue-600">
                  <Bell className="w-4 h-4 mr-1" />
                  {task.reminderMinutes < 60 
                    ? `${task.reminderMinutes}m reminder`
                    : task.reminderMinutes < 1440
                      ? `${Math.floor(task.reminderMinutes / 60)}h reminder`
                      : `${Math.floor(task.reminderMinutes / 1440)}d reminder`
                  }
                </span>
              )}

              {!task.completed && getSyncStatusIcon()}
            </div>
            
            {task.syncStatus === "failed" && task.syncError && (
              <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                <strong>Sync Error:</strong> {task.syncError}
              </div>
            )}
          </div>
        </div>
        <div className="ml-4 flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-gray-600 p-1 h-auto"
            onClick={() => onEdit(task)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-red-600 p-1 h-auto"
            onClick={handleDelete}
            disabled={deleteTaskMutation.isPending}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
