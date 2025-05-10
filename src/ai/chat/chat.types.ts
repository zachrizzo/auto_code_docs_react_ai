/**
 * Types specific to chat feature logic (not shared with other features).
 * For shared types, use shared/ai.types.ts.
 */

/**
 * Represents a message with a timestamp (for advanced chat features).
 * @example
 * const msg: TimestampedChatMessage = {
 *   role: 'user',
 *   content: 'Hello',
 *   timestamp: 1710000000000
 * };
 */
export interface TimestampedChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number; // Unix ms
}

/**
 * Enum for chat roles (for stricter typing if desired).
 */
export enum ChatRole {
  System = 'system',
  User = 'user',
  Assistant = 'assistant',
}
