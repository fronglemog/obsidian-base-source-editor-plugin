/* ========================= IMPORTS ========================= */
/* CODEMIRROR */
import { linter } from '@codemirror/lint';
import type { Diagnostic } from '@codemirror/lint';

import type { Extension } from '@codemirror/state';

import { EditorView } from '@codemirror/view';

/* PLUGIN */
import { lintTooltipAtCursorField } from 'src/Linting/lintTooltipAtCursor';
import { getYamlSyntaxDiagnostics } from 'src/Linting/yamlSyntaxDiagnostics';
import type { YamlSyntaxDiagnostic } from 'src/Linting/yamlSyntaxDiagnostics';

/* ========================= LINTING ========================= */

/**
 * The lint tooltips' look, matching Obsidian's own tooltips.
 *
 * @remarks
 * A CodeMirror theme rather than `styles.css`: tooltips are drawn in `<body>`, outside the view, so the view's
 * selector can't reach them. CodeMirror gives a tooltip's container the editor's theme class, so these rules
 * reach this editor's lint tooltips and no other editor's.
 *
 * Only Obsidian's tooltip variables are used, as its `.tooltip` class does, so themes that restyle Obsidian's
 * tooltips restyle these too. The text is left-aligned, unlike Obsidian's tooltips, because several errors
 * are listed one per row.
 */
const lintTooltipTheme: Extension = EditorView.theme({
  '.cm-tooltip:has(> .cm-tooltip-lint)': {
    backgroundColor: 'var(--tooltip-background)',
    border: 'none',
    borderRadius: 'var(--tooltip-radius)',
    boxShadow: 'var(--tooltip-shadow)',
    color: 'var(--tooltip-color)',
    cornerShape: 'var(--tooltip-corner-shape)',
    fontFamily: 'var(--font-interface)',
    fontSize: 'var(--tooltip-font-size)',
    fontWeight: 'var(--tooltip-font-weight)',
    lineHeight: 'var(--tooltip-line-height)',
    maxWidth: 'var(--tooltip-max-width)',
    padding: 'var(--tooltip-padding)'
  },
  // The lint package's own spacing and red bar on the left of each error
  '.cm-tooltip-lint .cm-diagnostic': {
    borderLeft: 'none',
    marginLeft: '0',
    padding: '0'
  }
});

/**
 * Hides the lint package's hover tooltip, on touch screens.
 *
 * @remarks
 * A tap can also count as hovering, so the hover tooltip could show as well as the cursor tooltip
 * ({@link lintTooltipAtCursorField}). The cursor tooltip has no `cm-tooltip-hover` class, so it isn't hidden.
 */
const hideLintHoverTooltipTheme: Extension = EditorView.theme({
  '.cm-tooltip-hover:has(> .cm-tooltip-lint)': {
    display: 'none'
  }
});

/**
 * Turns YAML errors into the lint package's diagnostics.
 *
 * @param text - The Base's text.
 * @returns One error diagnostic per YAML error.
 */
export function getYamlLintDiagnostics(text: string): Diagnostic[] {
  return getYamlSyntaxDiagnostics(text).map((yamlDiagnostic: YamlSyntaxDiagnostic): Diagnostic => ({
    from: yamlDiagnostic.from,
    to: yamlDiagnostic.to,
    severity: 'error',
    message: yamlDiagnostic.message
  }));
}

/**
 * Checks the editor's text, for the lint package's `linter()`.
 *
 * @param view - The editor view.
 * @returns The errors in the editor's text.
 */
function lintBaseYaml(view: EditorView): Diagnostic[] {
  return getYamlLintDiagnostics(view.state.doc.toString());
}

/**
 * Gets the extensions that underline mistakes in the YAML.
 *
 * @remarks
 * Uses Obsidian's copy of the lint package, which it provides to plugins. The lint package runs the check
 * 750ms after the text last changed, its default.
 *
 * @param extensionEnabled - Whether the "Show YAML errors" setting is on.
 * @param isMobile - Whether Obsidian is running on a phone or tablet: they get the cursor tooltip instead of the hover tooltip.
 * @returns The extensions, or none if `extensionEnabled` is `false`.
 */
export function getLintingExtensions(extensionEnabled: boolean, isMobile: boolean): Extension[] {
  if (extensionEnabled === false) {
    return [];
  }

  const extensions: Extension[] = [
    linter(lintBaseYaml),
    lintTooltipTheme
  ];

  if (isMobile) {
    extensions.push(lintTooltipAtCursorField, hideLintHoverTooltipTheme);
  }

  return extensions;
}
