// Token and ticket lifetimes. The server is the sole temporal authority (ADR-0004).
export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export const ACCOUNT_ACCESS_TTL = 15 * MINUTE;
export const ACCOUNT_REFRESH_TTL = 30 * DAY;

export const ACTIVATION_CODE_TTL = 60 * MINUTE;
export const ACTIVATION_TICKET_TTL = 15 * MINUTE;
export const PAIRING_TICKET_TTL = 15 * MINUTE;

export const DEVICE_ACCESS_TTL = 60 * MINUTE;
export const DEVICE_REFRESH_TTL = 90 * DAY;

export const MAX_ACTIVATION_ATTEMPTS = 5;
