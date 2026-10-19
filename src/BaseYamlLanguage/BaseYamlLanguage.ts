/* ========================= IMPORTS ========================= */
/* CODEMIRROR */
import { LanguageSupport } from '@codemirror/language';
import type { LRLanguage } from '@codemirror/language';

import {
  yaml,
  yamlLanguage
} from '@codemirror/lang-yaml';

import { parseMixed } from '@lezer/common';

import type {
  Input,
  NestedParse,
  Parser,
  ParseWrapper,
  SyntaxNodeRef
} from '@lezer/common';

/* PLUGIN */
import { getBaseFormulaParser } from 'src/BaseYamlLanguage/baseFormulaParser';
import { getQuotedLiteralRanges } from 'src/BaseYamlLanguage/quotedLiteralRanges';
import type { DocumentRange } from 'src/BaseYamlLanguage/quotedLiteralRanges';
import {
  getYamlKeyPath,
  isFormulaPath
} from 'src/BaseYamlLanguage/yamlKeyPath';

/* ========================= BaseYamlLanguage ========================= */

/**
 * YAML language support for `.base` files, with formulas parsed by Obsidian's formula parser.
 */
export class BaseYamlLanguage {
  /** Cached language support */
  private languageSupport: LanguageSupport | null = null;

  /**
   * Gets the language support for Base Source editors.
   *
   * @returns YAML language support that parses formulas, or plain YAML if Obsidian's formula parser can't be found.
   */
  getLanguageSupport(): LanguageSupport {
    if (this.languageSupport != null) {
      return this.languageSupport;
    }

    const baseFormulaParser: Parser | null = getBaseFormulaParser();

    if (baseFormulaParser == null) {
      this.languageSupport = yaml();
    }
    else {
      const language: LRLanguage = this.createBaseYamlLanguage(baseFormulaParser);
      this.languageSupport = new LanguageSupport(language);
    }

    return this.languageSupport;
  }

  /**
   * Creates the YAML language, with formula values parsed by a formula parser.
   *
   * @param parser - Obsidian's formula parser.
   * @returns The language.
   */
  private createBaseYamlLanguage(parser: Parser): LRLanguage {
    const parseWrapper: ParseWrapper = parseMixed((node: SyntaxNodeRef, input: Input): NestedParse | null => {
      const parse: NestedParse | null = this.getBaseFormulaParse(node, input, parser);
      return parse;
    });

    const language: LRLanguage = yamlLanguage.configure({
      wrap: parseWrapper
    });

    return language;
  }

  /**
   * Gets the nested parse for a YAML node, if its value is a formula.
   *
   * @remarks
   * For a quoted value, only the text between the quotes is parsed, without YAML's escape characters,
   * so the formula parser sees the formula Obsidian reads.
   *
   * @param node - YAML syntax node.
   * @param input - The document's text.
   * @param formulaParser - Obsidian's formula parser.
   * @returns The nested parse, or `null` if the node isn't a formula.
   */
  private getBaseFormulaParse(node: SyntaxNodeRef, input: Input, formulaParser: Parser): NestedParse | null {
    const isSupportedNode: boolean =
      node.name === 'Literal' ||
      node.name === 'QuotedLiteral' ||
      node.name === 'BlockLiteralContent';

    if (isSupportedNode === false) {
      return null;
    }

    const keyPath: string[] | null = getYamlKeyPath(node.node, (from: number, to: number): string => input.read(from, to));

    if (keyPath == null) {
      return null;
    }

    if (isFormulaPath(keyPath) === false) {
      return null;
    }

    if (node.name === 'QuotedLiteral') {
      const quote: string = input.read(node.from, node.from + 1);
      const contentStart: number = node.from + 1;
      const contentEnd: number = node.to - 1;

      if (contentStart >= contentEnd) {
        return null;
      }

      const content: string = input.read(contentStart, contentEnd);
      const contentRanges: DocumentRange[] = getQuotedLiteralRanges(content, contentStart, quote);

      if (contentRanges.length === 0) {
        return null;
      }

      const nestedParse: NestedParse = {
        parser: formulaParser,
        overlay: contentRanges
      };

      return nestedParse;
    }

    const nestedParse: NestedParse = {
      parser: formulaParser
    };

    return nestedParse;
  }
}
