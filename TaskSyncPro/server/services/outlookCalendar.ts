import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import type { Task } from '@shared/schema';

const OUTLOOK_CLIENT_ID = process.env.OUTLOOK_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID || '';
const OUTLOOK_CLIENT_SECRET = process.env.OUTLOOK_CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET || '';
const OUTLOOK_REFRESH_TOKEN = process.env.OUTLOOK_REFRESH_TOKEN || process.env.MICROSOFT_REFRESH_TOKEN || '';
const OUTLOOK_TENANT_ID = process.env.OUTLOOK_TENANT_ID || process.env.MICROSOFT_TENANT_ID || 'common';

class SimpleAuthProvider implements AuthenticationProvider {
  private accessToken: string | null = null;

  async getAccessToken(): Promise<string> {
    if (!OUTLOOK_CLIENT_ID || !OUTLOOK_CLIENT_SECRET || !OUTLOOK_REFRESH_TOKEN) {
      throw new Error('Outlook credentials not found');
    }

    // In a real implementation, you would refresh the token here
    // For now, we'll simulate having a valid token
    if (!this.accessToken) {
      // This would typically make a request to Microsoft's token endpoint
      // using the refresh token to get a new access token
      throw new Error('Outlook authentication not implemented. Please provide valid access token.');
    }

    return this.accessToken;
  }
}

export class OutlookCalendarService {
  private client: Client | null = null;
  private authProvider: SimpleAuthProvider;

  constructor() {
    if (!OUTLOOK_CLIENT_ID || !OUTLOOK_CLIENT_SECRET || !OUTLOOK_REFRESH_TOKEN) {
      console.warn('Outlook Calendar credentials not found. Sync will be disabled.');
      return;
    }

    this.authProvider = new SimpleAuthProvider();
    this.client = Client.initWithMiddleware({
      authProvider: this.authProvider,
    });
  }

  async createEvent(task: Task): Promise<string | null> {
    if (!this.client) {
      throw new Error('Outlook Calendar not initialized. Check credentials.');
    }

    try {
      const event = {
        subject: task.title,
        body: {
          contentType: 'Text',
          content: task.description || '',
        },
        start: task.dueDate ? {
          dateTime: task.dueDate.toISOString(),
          timeZone: 'UTC',
        } : {
          dateTime: new Date().toISOString(),
          timeZone: 'UTC',
        },
        end: task.dueDate ? {
          dateTime: new Date(task.dueDate.getTime() + 60 * 60 * 1000).toISOString(),
          timeZone: 'UTC',
        } : {
          dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          timeZone: 'UTC',
        },
      };

      const response = await this.client.api('/me/events').post(event);
      return response.id;
    } catch (error) {
      console.error('Outlook Calendar sync error:', error);
      throw error;
    }
  }

  async updateEvent(eventId: string, task: Task): Promise<void> {
    if (!this.client) {
      throw new Error('Outlook Calendar not initialized. Check credentials.');
    }

    try {
      const event = {
        subject: task.title,
        body: {
          contentType: 'Text',
          content: task.description || '',
        },
        start: task.dueDate ? {
          dateTime: task.dueDate.toISOString(),
          timeZone: 'UTC',
        } : {
          dateTime: new Date().toISOString(),
          timeZone: 'UTC',
        },
        end: task.dueDate ? {
          dateTime: new Date(task.dueDate.getTime() + 60 * 60 * 1000).toISOString(),
          timeZone: 'UTC',
        } : {
          dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          timeZone: 'UTC',
        },
      };

      await this.client.api(`/me/events/${eventId}`).patch(event);
    } catch (error) {
      console.error('Outlook Calendar update error:', error);
      throw error;
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    if (!this.client) {
      throw new Error('Outlook Calendar not initialized. Check credentials.');
    }

    try {
      await this.client.api(`/me/events/${eventId}`).delete();
    } catch (error) {
      console.error('Outlook Calendar delete error:', error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return !!this.client;
  }
}

export const outlookCalendarService = new OutlookCalendarService();
