/**
 * Utility functions for chat feature (CodebaseChatService).
 */

/**
 * Format a chat message as a string for display or logging.
 * @param msg The chat message object.
 * @returns Formatted string.
 * @example
 * formatChatMessage({ role: 'user', content: 'Hello!' }) // '[USER]: Hello!'
 */
export function formatChatMessage(msg: { role: string; content: string }): string {
  return `[${msg.role.toUpperCase()}]: ${msg.content}`;
}

/**
 * Truncate a string to a certain number of characters, adding ellipsis if needed.
 * @param text The string to truncate.
 * @param maxLen Maximum length.
 * @returns Truncated string.
 * @example
 * truncate('Hello world', 5) // 'Hello...'
 */
export function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
}
