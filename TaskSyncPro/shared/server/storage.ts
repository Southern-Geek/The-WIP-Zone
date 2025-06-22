import { users, tasks, type User, type InsertUser, type Task, type InsertTask, type UpdateTask } from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Task methods
  getTasks(): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: UpdateTask): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  updateTaskSyncStatus(id: number, status: string, error?: string, googleId?: string, outlookId?: string): Promise<Task | undefined>;
  createRecurringInstance(parentTask: Task, dueDate: Date): Promise<Task>;
  getTasksByCategory(category: string): Promise<Task[]>;
  getTasksByLabel(label: string): Promise<Task[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tasks: Map<number, Task>;
  private currentUserId: number;
  private currentTaskId: number;

  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.currentUserId = 1;
    this.currentTaskId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.currentTaskId++;
    const now = new Date();
    const task: Task = {
      ...insertTask,
      id,
      description: insertTask.description || null,
      dueDate: insertTask.dueDate || null,
      completed: insertTask.completed || false,
      priority: insertTask.priority || "medium",
      category: insertTask.category || "general",
      labels: insertTask.labels || [],
      reminderMinutes: insertTask.reminderMinutes || null,
      isRecurring: insertTask.isRecurring || false,
      recurringPattern: insertTask.recurringPattern || null,
      recurringInterval: insertTask.recurringInterval || 1,
      recurringEndDate: insertTask.recurringEndDate || null,
      parentTaskId: insertTask.parentTaskId || null,
      syncStatus: "pending",
      syncError: null,
      googleCalendarId: null,
      outlookCalendarId: null,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: number, updates: UpdateTask): Promise<Task | undefined> {
    const existingTask = this.tasks.get(id);
    if (!existingTask) return undefined;

    const updatedTask: Task = {
      ...existingTask,
      ...updates,
      updatedAt: new Date(),
    };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }

  async updateTaskSyncStatus(
    id: number, 
    status: string, 
    error?: string, 
    googleId?: string, 
    outlookId?: string
  ): Promise<Task | undefined> {
    const existingTask = this.tasks.get(id);
    if (!existingTask) return undefined;

    const updatedTask: Task = {
      ...existingTask,
      syncStatus: status,
      syncError: error || null,
      googleCalendarId: googleId || existingTask.googleCalendarId,
      outlookCalendarId: outlookId || existingTask.outlookCalendarId,
      updatedAt: new Date(),
    };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async createRecurringInstance(parentTask: Task, dueDate: Date): Promise<Task> {
    const id = this.currentTaskId++;
    const now = new Date();
    const task: Task = {
      ...parentTask,
      id,
      dueDate,
      completed: false,
      parentTaskId: parentTask.id,
      syncStatus: "pending",
      syncError: null,
      googleCalendarId: null,
      outlookCalendarId: null,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(id, task);
    return task;
  }

  async getTasksByCategory(category: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.category === category);
  }

  async getTasksByLabel(label: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.labels.includes(label));
  }
}

export const storage = new MemStorage();
