import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  completed: boolean("completed").default(false).notNull(),
  priority: text("priority").default("medium").notNull(), // low, medium, high, urgent
  category: text("category").default("general").notNull(),
  labels: text("labels").array().default([]).notNull(),
  reminderMinutes: integer("reminder_minutes"), // minutes before due date
  isRecurring: boolean("is_recurring").default(false).notNull(),
  recurringPattern: text("recurring_pattern"), // daily, weekly, monthly, yearly
  recurringInterval: integer("recurring_interval").default(1), // every N days/weeks/months
  recurringEndDate: timestamp("recurring_end_date"),
  parentTaskId: integer("parent_task_id"), // for recurring task instances
  googleCalendarId: text("google_calendar_id"),
  outlookCalendarId: text("outlook_calendar_id"),
  syncStatus: text("sync_status").default("pending").notNull(), // pending, synced, syncing, failed
  syncError: text("sync_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTaskSchema = createInsertSchema(tasks).pick({
  title: true,
  description: true,
  dueDate: true,
  completed: true,
  priority: true,
  category: true,
  labels: true,
  reminderMinutes: true,
  isRecurring: true,
  recurringPattern: true,
  recurringInterval: true,
  recurringEndDate: true,
  parentTaskId: true,
});

export const updateTaskSchema = insertTaskSchema.partial();

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type Task = typeof tasks.$inferSelect;
