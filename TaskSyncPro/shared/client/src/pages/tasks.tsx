import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Search, Menu, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Sidebar } from "@/components/sidebar";
import { TaskForm } from "@/components/task-form";
import { TaskItem } from "@/components/task-item";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Task } from "@shared/schema";

export default function TasksPage() {
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    refetchInterval: 30000, // Refresh every 30 seconds for sync status
  });

  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ["/api/categories"],
  });

  const { data: labels = [] } = useQuery<string[]>({
    queryKey: ["/api/labels"],
  });

  const manualSyncMutation = useMutation({
    mutationFn: async () => {
      // Trigger sync for all pending/failed tasks
      const pendingTasks = tasks.filter(task => 
        task.syncStatus === "pending" || task.syncStatus === "failed"
      );
      
      const syncPromises = pendingTasks.map(task =>
        apiRequest("POST", `/api/tasks/${task.id}/sync`)
      );
      
      await Promise.all(syncPromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Sync initiated",
        description: "Manual sync started for all tasks",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to initiate sync: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskFormOpen(true);
  };

  const handleCloseTaskForm = () => {
    setIsTaskFormOpen(false);
    setEditingTask(null);
  };

  const handleManualSync = () => {
    manualSyncMutation.mutate();
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setSelectedPriorities([]);
    setSelectedCategories([]);
    setSelectedLabels([]);
  };

  const hasActiveFilters = searchQuery || filterStatus !== "all" || 
    selectedPriorities.length > 0 || selectedCategories.length > 0 || selectedLabels.length > 0;

  // Filter and sort tasks
  const filteredTasks = tasks
    .filter(task => {
      // Search filter
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !task.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Status filter
      switch (filterStatus) {
        case "pending":
          if (task.completed) return false;
          break;
        case "completed":
          if (!task.completed) return false;
          break;
        case "overdue":
          if (task.completed || !task.dueDate || new Date(task.dueDate) >= new Date()) return false;
          break;
      }

      // Priority filter
      if (selectedPriorities.length > 0 && !selectedPriorities.includes(task.priority)) {
        return false;
      }

      // Category filter
      if (selectedCategories.length > 0 && !selectedCategories.includes(task.category)) {
        return false;
      }

      // Label filter
      if (selectedLabels.length > 0 && !selectedLabels.some(label => task.labels.includes(label))) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "priority":
          // Sort by overdue, then sync status, then date
          const aOverdue = a.dueDate && new Date(a.dueDate) < new Date();
          const bOverdue = b.dueDate && new Date(b.dueDate) < new Date();
          if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
          
          if (a.syncStatus !== b.syncStatus) {
            const statusOrder = { failed: 0, syncing: 1, pending: 2, synced: 3 };
            return statusOrder[a.syncStatus as keyof typeof statusOrder] - 
                   statusOrder[b.syncStatus as keyof typeof statusOrder];
          }
          
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "name":
          return a.title.localeCompare(b.title);
        default: // date
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const taskCounts = {
    total: tasks.length,
    pending: tasks.filter(t => !t.completed).length,
    completed: tasks.filter(t => t.completed).length,
    overdue: tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length,
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="lg:ml-64 flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden mr-2"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <Menu className="h-6 w-6" />
              </Button>
              <h1 className="text-2xl font-semibold text-gray-900">All Tasks</h1>
              <Badge variant="secondary" className="ml-3">
                {taskCounts.total} tasks
              </Badge>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSync}
                disabled={manualSyncMutation.isPending}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${manualSyncMutation.isPending ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
              <Button onClick={() => setIsTaskFormOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Filters */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-2 flex-wrap">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All tasks</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Sort by date</SelectItem>
                      <SelectItem value="priority">Sort by priority</SelectItem>
                      <SelectItem value="name">Sort by name</SelectItem>
                    </SelectContent>
                  </Select>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Filter className="w-4 h-4 mr-2" />
                        Filters
                        {hasActiveFilters && (
                          <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                            {(selectedPriorities.length + selectedCategories.length + selectedLabels.length)}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Advanced Filters</h4>
                          {hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                              <X className="w-4 h-4 mr-1" />
                              Clear
                            </Button>
                          )}
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">Priority</label>
                          <div className="space-y-2">
                            {["urgent", "high", "medium", "low"].map((priority) => (
                              <div key={priority} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={selectedPriorities.includes(priority)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedPriorities([...selectedPriorities, priority]);
                                    } else {
                                      setSelectedPriorities(selectedPriorities.filter(p => p !== priority));
                                    }
                                  }}
                                />
                                <span className="text-sm capitalize">
                                  {priority === "urgent" && "🔴"} 
                                  {priority === "high" && "🟠"} 
                                  {priority === "medium" && "🟡"} 
                                  {priority === "low" && "🟢"} 
                                  {priority}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {categories.length > 0 && (
                          <div>
                            <label className="text-sm font-medium mb-2 block">Categories</label>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {categories.map((category) => (
                                <div key={category} className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={selectedCategories.includes(category)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedCategories([...selectedCategories, category]);
                                      } else {
                                        setSelectedCategories(selectedCategories.filter(c => c !== category));
                                      }
                                    }}
                                  />
                                  <span className="text-sm">{category}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {labels.length > 0 && (
                          <div>
                            <label className="text-sm font-medium mb-2 block">Labels</label>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {labels.map((label) => (
                                <div key={label} className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={selectedLabels.includes(label)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedLabels([...selectedLabels, label]);
                                      } else {
                                        setSelectedLabels(selectedLabels.filter(l => l !== label));
                                      }
                                    }}
                                  />
                                  <span className="text-sm">{label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Active filter chips */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2">
                  {selectedPriorities.map((priority) => (
                    <Badge key={priority} variant="secondary" className="flex items-center gap-1">
                      Priority: {priority}
                      <button
                        onClick={() => setSelectedPriorities(selectedPriorities.filter(p => p !== priority))}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  {selectedCategories.map((category) => (
                    <Badge key={category} variant="secondary" className="flex items-center gap-1">
                      Category: {category}
                      <button
                        onClick={() => setSelectedCategories(selectedCategories.filter(c => c !== category))}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  {selectedLabels.map((label) => (
                    <Badge key={label} variant="secondary" className="flex items-center gap-1">
                      Label: {label}
                      <button
                        onClick={() => setSelectedLabels(selectedLabels.filter(l => l !== label))}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Task List */}
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
                    <div className="flex items-start space-x-3">
                      <div className="w-4 h-4 bg-gray-200 rounded"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredTasks.length > 0 ? (
              <div className="space-y-4">
                {filteredTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onEdit={handleEditTask}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  {searchQuery || filterStatus !== "all" ? "No matching tasks" : "No tasks yet"}
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  {searchQuery || filterStatus !== "all" 
                    ? "Try adjusting your search or filters"
                    : "Get started by creating your first task."
                  }
                </p>
                {!searchQuery && filterStatus === "all" && (
                  <Button onClick={() => setIsTaskFormOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add your first task
                  </Button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <TaskForm
        isOpen={isTaskFormOpen}
        onClose={handleCloseTaskForm}
        task={editingTask}
      />
    </div>
  );
}
