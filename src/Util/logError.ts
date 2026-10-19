/* ========================= logError ========================= */

/**
 * Logs an error to console.
 *
 * @param message - Description of the error.
 * @param error - The thrown error.
 */
export function logError(message: string, error?: unknown): void {
  const prefixedMessage: string = `Base Source Editor: ${message}`;

  if (error == null) {
    console.error(prefixedMessage);
  }
  else {
    console.error(prefixedMessage, error);
  }
}
