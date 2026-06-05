export interface GoogleCalendarIntegration {
  connected: boolean;
  refreshToken?: string;
  accessToken?: string;
  expiryDate?: number;
  calendarId?: string;
  email?: string;
  /** Scopes returned on last OAuth connect (for diagnostics). */
  scope?: string;
}

/** Read-only calendar via private iCal URL + optional embed */
export interface CalendarFeedConfig {
  icalFeedUrl?: string;
  /** Google embed `src` value, e.g. mikiyasabate003@gmail.com */
  embedSrc?: string;
  timezone?: string;
}

export interface LifeosCalendarExport {
  /** Secret token for public .ics feed URL */
  token: string;
  createdAt?: string;
}

export interface UserIntegrations {
  googleCalendar?: GoogleCalendarIntegration;
  calendarFeed?: CalendarFeedConfig;
  /** One-way LifeOS → Google via subscribed .ics (no Google API required) */
  lifeosExport?: LifeosCalendarExport;
}

export interface CalendarEventPreview {
  uid: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  recurring: boolean;
}
