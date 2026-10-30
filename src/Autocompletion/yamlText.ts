/* ========================= IMPORTS ========================= */
/* OBSIDIAN */
import { stringifyYaml } from 'obsidian';

/* ========================= YAML TEXT ========================= */

/**
 * Writes text as a YAML value, in quotes only where Obsidian would write it in quotes.
 *
 * @remarks
 * Uses Obsidian's `stringifyYaml()`, which Obsidian also saves Bases with, so a value is written as Obsidian writes it:
 * `film - year` and `Filtered mean` without quotes, `"File: name"` with them.
 * Text too long for one line, which `stringifyYaml()` would fold onto several, is written in JSON's double quotes instead:
 * also valid YAML, and on one line.
 *
 * @param text - The text.
 * @returns The YAML value, such as `medium`, or `", "` for text that needs quotes.
 */
export function toYamlText(text: string): string {
  const yamlText: string = stringifyYaml(text).trimEnd();
  return yamlText.includes('\n') ? JSON.stringify(text) : yamlText;
}
