import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertTaskSchema, updateTaskSchema } from "@shared/schema";
import type { Task } from "@shared/schema";
import { z } from "zod";
import { useState } from "react";

const formSchema = insertTaskSchema.extend({
  dueDate: z.string().optional(),
  recurringEndDate: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;
}

export function TaskForm({ isOpen, onClose, task }: TaskFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!task;
  const [newLabel, setNewLabel] = useState("");

  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ["/api/categories"],
  });

  const { data: existingLabels = [] } = useQuery<string[]>({
    queryKey: ["/api/labels"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: task?.title || "",
      description: task?.description || "",
      dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : "",
      completed: task?.completed || false,
      priority: task?.priority || "medium",
      category: task?.category || "general",
      labels: task?.labels || [],
      reminderMinutes: task?.reminderMinutes || undefined,
      isRecurring: task?.isRecurring || false,
      recurringPattern: task?.recurringPattern || undefined,
      recurringInterval: task?.recurringInterval || 1,
      recurringEndDate: task?.recurringEndDate ? new Date(task.recurringEndDate).toISOString().slice(0, 10) : "",
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const taskData = {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        recurringEndDate: data.recurringEndDate ? new Date(data.recurringEndDate) : null,
      };
      const res = await apiRequest("POST", "/api/tasks", taskData);
      return res.json();
    },
    onSuccess: (createdTask) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/labels"] });
      
      // Auto-generate recurring instances if it's a recurring task
      if (createdTask.isRecurring) {
        generateRecurringInstances(createdTask.id);
      }
      
      toast({
        title: "Success",
        description: "Task created successfully and sync initiated",
      });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create task: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!task) throw new Error("No task to update");
      const taskData = {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        recurringEndDate: data.recurringEndDate ? new Date(data.recurringEndDate) : null,
      };
      const res = await apiRequest("PATCH", `/api/tasks/${task.id}`, taskData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/labels"] });
      toast({
        title: "Success",
        description: "Task updated successfully and sync initiated",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update task: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const generateRecurringInstances = async (taskId: number) => {
    try {
      await apiRequest("POST", `/api/tasks/${taskId}/generate-recurring`);
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    } catch (error) {
      console.error("Failed to generate recurring instances:", error);
    }
  };

  const onSubmit = (data: FormData) => {
    if (isEditing) {
      updateTaskMutation.mutate(data);
    } else {
      createTaskMutation.mutate(data);
    }
  };

  const handleClose = () => {
    onClose();
    form.reset();
    setNewLabel("");
  };

  const handleAddLabel = () => {
    if (newLabel.trim()) {
      const currentLabels = form.getValues("labels") || [];
      if (!currentLabels.includes(newLabel.trim())) {
        form.setValue("labels", [...currentLabels, newLabel.trim()]);
      }
      setNewLabel("");
    }
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    const currentLabels = form.getValues("labels") || [];
    form.setValue("labels", currentLabels.filter(label => label !== labelToRemove));
  };

  const isRecurring = form.watch("isRecurring");
  const isPending = createTaskMutation.isPending || updateTaskMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {isEditing ? "Edit Task" : "Add New Task"}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {isEditing 
              ? "Update your task details. Changes will be synced to your calendars."
              : "Create a new task that will be automatically synced to your calendars."
            }
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter task title..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add task description..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">🟢 Low</SelectItem>
                          <SelectItem value="medium">🟡 Medium</SelectItem>
                          <SelectItem value="high">🟠 High</SelectItem>
                          <SelectItem value="urgent">🔴 Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Work, Personal, Health"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="labels"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Labels</FormLabel>
                    <div className="space-y-3">
                      {field.value && field.value.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {field.value.map((label, index) => (
                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                              {label}
                              <button
                                type="button"
                                onClick={() => handleRemoveLabel(label)}
                                className="ml-1 text-xs hover:text-red-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add label..."
                          value={newLabel}
                          onChange={(e) => setNewLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddLabel();
                            }
                          }}
                        />
                        <Button type="button" onClick={handleAddLabel} size="sm">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reminderMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reminder (minutes before)</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="No reminder" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">At time of event</SelectItem>
                          <SelectItem value="15">15 minutes before</SelectItem>
                          <SelectItem value="30">30 minutes before</SelectItem>
                          <SelectItem value="60">1 hour before</SelectItem>
                          <SelectItem value="1440">1 day before</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isRecurring"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Make this a recurring task</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {isRecurring && (
                <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium text-sm">Recurring Options</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="recurringPattern"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Repeat</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select pattern" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="recurringInterval"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Every</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="365"
                              placeholder="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="recurringEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date (optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {isEditing && (
                <FormField
                  control={form.control}
                  name="completed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Mark as completed</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="space-y-2">
              <FormLabel>Sync to Calendars</FormLabel>
              <div className="text-sm text-muted-foreground">
                This task will be automatically synced to Google Calendar and Outlook Calendar when available.
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                    {isEditing ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  isEditing ? "Update Task" : "Create Task"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
