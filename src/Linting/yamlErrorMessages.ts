/* ========================= IMPORTS ========================= */
/* YAML */
import type { ErrorCode } from 'yaml';

/* ========================= YAML ERROR MESSAGES ========================= */

/**
 * Messages that replace the `yaml` package's own, by error code.
 *
 * @remarks
 * Plain-English versions of the package's harder messages can be added here.
 */
const MESSAGE_OVERRIDES: Partial<Record<ErrorCode, string>> = {
  // The package's message tells developers to call `YAML.parseAllDocuments()`
  MULTIPLE_DOCS: 'A Base can only contain one YAML document, but this `---` starts a second one'
};

/**
 * Gets the message to show for a YAML error.
 *
 * @param code - The error's code, from the `yaml` package.
 * @param message - The package's own message. Parsed with `prettyErrors: false`, it's one sentence, with no line, column or snippet.
 * @returns The replacement message for `code` if there is one, otherwise `message`.
 */
export function getYamlErrorMessage(code: ErrorCode, message: string): string {
  return MESSAGE_OVERRIDES[code] ?? message;
}
