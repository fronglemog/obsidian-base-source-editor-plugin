/* ========================= IMPORTS ========================= */
/* YAML */
import { parseDocument } from 'yaml';

import type {
  Document,
  YAMLError
} from 'yaml';

/* PLUGIN */
import { getYamlErrorMessage } from 'src/Linting/yamlErrorMessages';
import { getYamlErrorRange } from 'src/Linting/yamlErrorRange';
import type { TextRange } from 'src/Linting/yamlErrorRange';
import { logError } from 'src/Util/logError';

/* ========================= YAML SYNTAX DIAGNOSTICS ========================= */

/** A YAML error: the text to underline, and the message to show. */
export type YamlSyntaxDiagnostic = TextRange & {
  message: string;
};

/**
 * Finds the mistakes in a Base's YAML that stop Obsidian reading the file.
 *
 * @remarks
 * Obsidian reads a Base with `parseYaml()`, which is the `yaml` package's `parse()` with its default options.
 * `parseDocument()` uses the same parser and options, but collects every error instead of stopping at the first.
 * The one option changed is `prettyErrors`, which would add the line, column and a snippet of the file to each message.
 *
 * The package's warnings are left out: they don't stop Obsidian reading the file.
 *
 * @param text - The Base's text.
 * @returns One entry per error, in the order the package reports them. None if checking fails, and the reason is logged.
 */
export function getYamlSyntaxDiagnostics(text: string): YamlSyntaxDiagnostic[] {
  try {
    const document: Document = parseDocument(text, { prettyErrors: false });

    return document.errors.map((error: YAMLError): YamlSyntaxDiagnostic => ({
      ...getYamlErrorRange(document, text, error.pos[0]),
      message: getYamlErrorMessage(error.code, error.message)
    }));
  }
  catch (error) {
    // No underlines rather than stale ones
    logError('Couldn\'t check the YAML for errors.', error);
    return [];
  }
}
