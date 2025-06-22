import { google } from 'googleapis';
import type { Task } from '@shared/schema';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CALENDAR_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '';
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || process.env.GOOGLE_CALENDAR_REFRESH_TOKEN || '';

export class GoogleCalendarService {
  private auth: any;
  private calendar: any;

  constructor() {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
      console.warn('Google Calendar credentials not found. Sync will be disabled.');
      return;
    }

    this.auth = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      'urn:ietf:wg:oauth:2.0:oob'
    );

    this.auth.setCredentials({
      refresh_token: GOOGLE_REFRESH_TOKEN,
    });

    this.calendar = google.calendar({ version: 'v3', auth: this.auth });
  }

  async createEvent(task: Task): Promise<string | null> {
    if (!this.calendar) {
      throw new Error('Google Calendar not initialized. Check credentials.');
    }

    try {
      const event = {
        summary: task.title,
        description: task.description || '',
        start: task.dueDate ? {
          dateTime: task.dueDate.toISOString(),
          timeZone: 'UTC',
        } : {
          date: new Date().toISOString().split('T')[0],
        },
        end: task.dueDate ? {
          dateTime: new Date(task.dueDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
          timeZone: 'UTC',
        } : {
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // next day
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });

      return response.data.id;
    } catch (error) {
      console.error('Google Calendar sync error:', error);
      throw error;
    }
  }

  async updateEvent(eventId: string, task: Task): Promise<void> {
    if (!this.calendar) {
      throw new Error('Google Calendar not initialized. Check credentials.');
    }

    try {
      const event = {
        summary: task.title,
        description: task.description || '',
        start: task.dueDate ? {
          dateTime: task.dueDate.toISOString(),
          timeZone: 'UTC',
        } : {
          date: new Date().toISOString().split('T')[0],
        },
        end: task.dueDate ? {
          dateTime: new Date(task.dueDate.getTime() + 60 * 60 * 1000).toISOString(),
          timeZone: 'UTC',
        } : {
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
      };

      await this.calendar.events.update({
        calendarId: 'primary',
        eventId,
        resource: event,
      });
    } catch (error) {
      console.error('Google Calendar update error:', error);
      throw error;
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    if (!this.calendar) {
      throw new Error('Google Calendar not initialized. Check credentials.');
    }

    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId,
      });
    } catch (error) {
      console.error('Google Calendar delete error:', error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return !!this.calendar;
  }
}

export const googleCalendarService = new GoogleCalendarService();
