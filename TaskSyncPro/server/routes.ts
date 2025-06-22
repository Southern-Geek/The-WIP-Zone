import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema, updateTaskSchema } from "@shared/schema";
import { googleCalendarService } from "./services/googleCalendar";
import { outlookCalendarService } from "./services/outlookCalendar";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all tasks
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Get single task
  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  // Create new task
  app.post("/api/tasks", async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validatedData);
      
      // Start sync process asynchronously
      syncTaskToCalendars(task.id);
      
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid task data", errors: error });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  // Update task
  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = updateTaskSchema.parse(req.body);
      
      const task = await storage.updateTask(id, validatedData);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Start sync process asynchronously
      syncTaskToCalendars(id);
      
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid task data", errors: error });
      }
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  // Delete task
  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Delete from calendars first
      try {
        if (task.googleCalendarId && googleCalendarService.isInitialized()) {
          await googleCalendarService.deleteEvent(task.googleCalendarId);
        }
        if (task.outlookCalendarId && outlookCalendarService.isInitialized()) {
          await outlookCalendarService.deleteEvent(task.outlookCalendarId);
        }
      } catch (syncError) {
        console.error("Error deleting from calendars:", syncError);
        // Continue with task deletion even if calendar sync fails
      }
      
      const deleted = await storage.deleteTask(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Retry sync for failed tasks
  app.post("/api/tasks/:id/sync", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Start sync process
      syncTaskToCalendars(id);
      
      res.json({ message: "Sync initiated" });
    } catch (error) {
      console.error("Error initiating sync:", error);
      res.status(500).json({ message: "Failed to initiate sync" });
    }
  });

  // Get sync status
  app.get("/api/sync/status", async (req, res) => {
    try {
      const status = {
        google: {
          connected: googleCalendarService.isInitialized(),
          service: 'Google Calendar'
        },
        outlook: {
          connected: outlookCalendarService.isInitialized(),
          service: 'Outlook Calendar'
        },
        lastSync: new Date().toISOString()
      };
      
      res.json(status);
    } catch (error) {
      console.error("Error getting sync status:", error);
      res.status(500).json({ message: "Failed to get sync status" });
    }
  });

  // Get all categories
  app.get("/api/categories", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      const categories = [...new Set(tasks.map(task => task.category))].sort();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Get all labels
  app.get("/api/labels", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      const labels = [...new Set(tasks.flatMap(task => task.labels))].sort();
      res.json(labels);
    } catch (error) {
      console.error("Error fetching labels:", error);
      res.status(500).json({ message: "Failed to fetch labels" });
    }
  });

  // Get tasks by category
  app.get("/api/tasks/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const tasks = await storage.getTasksByCategory(category);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks by category:", error);
      res.status(500).json({ message: "Failed to fetch tasks by category" });
    }
  });

  // Get tasks by label
  app.get("/api/tasks/label/:label", async (req, res) => {
    try {
      const { label } = req.params;
      const tasks = await storage.getTasksByLabel(label);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks by label:", error);
      res.status(500).json({ message: "Failed to fetch tasks by label" });
    }
  });

  // Generate recurring task instances
  app.post("/api/tasks/:id/generate-recurring", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (!task.isRecurring || !task.recurringPattern) {
        return res.status(400).json({ message: "Task is not recurring" });
      }

      const instances = await generateRecurringInstances(task);
      res.json({ message: `Generated ${instances.length} recurring instances`, instances });
    } catch (error) {
      console.error("Error generating recurring instances:", error);
      res.status(500).json({ message: "Failed to generate recurring instances" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to generate recurring task instances
async function generateRecurringInstances(parentTask: Task): Promise<Task[]> {
  const instances: Task[] = [];
  
  if (!parentTask.isRecurring || !parentTask.recurringPattern || !parentTask.dueDate) {
    return instances;
  }

  const startDate = new Date(parentTask.dueDate);
  const endDate = parentTask.recurringEndDate ? new Date(parentTask.recurringEndDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Default to 1 year
  
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate && instances.length < 52) { // Limit to 52 instances
    let nextDate = new Date(currentDate);
    
    switch (parentTask.recurringPattern) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + parentTask.recurringInterval);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + (7 * parentTask.recurringInterval));
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + parentTask.recurringInterval);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + parentTask.recurringInterval);
        break;
      default:
        break;
    }
    
    if (nextDate > endDate) break;
    
    const instance = await storage.createRecurringInstance(parentTask, nextDate);
    instances.push(instance);
    
    // Start sync for the new instance
    syncTaskToCalendars(instance.id);
    
    currentDate = nextDate;
  }
  
  return instances;
}

// Async function to sync task to calendars
async function syncTaskToCalendars(taskId: number) {
  try {
    const task = await storage.getTask(taskId);
    if (!task) return;

    // Update status to syncing
    await storage.updateTaskSyncStatus(taskId, "syncing");

    const errors: string[] = [];
    let googleId = task.googleCalendarId;
    let outlookId = task.outlookCalendarId;

    // Sync to Google Calendar
    try {
      if (googleCalendarService.isInitialized()) {
        if (googleId) {
          await googleCalendarService.updateEvent(googleId, task);
        } else {
          googleId = await googleCalendarService.createEvent(task);
        }
      }
    } catch (error) {
      console.error("Google Calendar sync failed:", error);
      errors.push(`Google Calendar: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Sync to Outlook Calendar
    try {
      if (outlookCalendarService.isInitialized()) {
        if (outlookId) {
          await outlookCalendarService.updateEvent(outlookId, task);
        } else {
          outlookId = await outlookCalendarService.createEvent(task);
        }
      }
    } catch (error) {
      console.error("Outlook Calendar sync failed:", error);
      errors.push(`Outlook Calendar: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Update final status
    if (errors.length > 0) {
      await storage.updateTaskSyncStatus(taskId, "failed", errors.join('; '), googleId ? googleId : undefined, outlookId ? outlookId : undefined);
    } else {
      await storage.updateTaskSyncStatus(taskId, "synced", undefined, googleId ? googleId : undefined, outlookId ? outlookId : undefined);
    }
  } catch (error) {
    console.error("Sync process failed:", error);
    await storage.updateTaskSyncStatus(taskId, "failed", `Sync process error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
