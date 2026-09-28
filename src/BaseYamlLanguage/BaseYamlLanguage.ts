/* ========================= IMPORTS ========================= */
import {
  LanguageSupport,
} from '@codemirror/language';

import type {
  LRLanguage
} from '@codemirror/language';

import {
  yaml,
  yamlLanguage
} from '@codemirror/lang-yaml';

import {
  parseMixed
} from '@lezer/common';

import type {
  Input,
  NestedParse,
  Parser,
  ParseWrapper,
  SyntaxNode,
  SyntaxNodeRef
} from '@lezer/common';

import { getBaseFormulaParser } from 'src/BaseYamlLanguage/baseFormulaParser';

/* ======================================================= */

export class BaseYamlLanguage {
  /**
   * Language support used by Base Source editors.
   */
  private languageSupport: LanguageSupport | null = null;

  constructor() {
  }

  /**
   * Gets language support for the YAML used in Obsidian Bases.
   * Falls back to plain YAML.
   * 
   * @returns YAML language support with formula parsing using Obsidian's Base formula parser.
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
   * Creates YAML language that implements Obsidian's Base formula parser.
   *
   * @param parser - Parser used for Obsidian formulas.
   * @returns The YAML language.
   */
  private createBaseYamlLanguage(parser: Parser): LRLanguage {
    const parseWrapper: ParseWrapper = parseMixed((node: SyntaxNodeRef, input: Input): NestedParse | null => {
      const parse: NestedParse | null = this.getBaseFormulaParse(node, input, parser);
      return parse;
    })

    const language: LRLanguage = yamlLanguage.configure({
      wrap: parseWrapper
    });

    return language;
  }

  /**
   * Gets the formula parsing configuration for a Base YAML value.
   * For quoted values, only the text between the quotes is parsed.
   *
   * @param node - YAML syntax node being parsed.
   * @param input - Source text used to determine the node's key path.
   * @param formulaParser - Parser used for Obsidian formula expressions.
   * @returns Parsing configuration, or null if no formula parse is needed.
   */
  private getBaseFormulaParse(node: SyntaxNodeRef, input: Input, formulaParser: Parser): NestedParse | null {
    const isSupportedNode: boolean =
      node.name === 'Literal' ||
      node.name === 'QuotedLiteral' ||
      node.name === 'BlockLiteralContent';

    if (isSupportedNode === false) {
      return null;
    }

    const keyPath: string[] | null = this.getKeyPath(node.node, input);

    if (keyPath == null) {
      return null;
    }

    if (this.isFormulaPath(keyPath) === false) {
      return null;
    }

    if (node.name === 'QuotedLiteral') {
      const contentStart: number = node.from + 1;
      const contentEnd: number = node.to - 1;

      if (contentStart >= contentEnd) {
        return null;
      }

      const nestedParse: NestedParse = {
        parser: formulaParser,
        overlay: [
          {
            from: contentStart,
            to: contentEnd
          }
        ]
      };

      return nestedParse;
    }

    const nestedParse: NestedParse = {
      parser: formulaParser
    };

    return nestedParse;
  }

  /**
   * Gets the YAML key path for a value.
   *
   * List items are represented by '#'. For example, a filter inside
   * a view might have the path ['views', '#', 'filters', 'and', '#'].
   *
   * @param node - Syntax node whose path should be determined.
   * @param input - Source text used to read key names.
   * @returns The key path, or null if the node is within a YAML key.
   */
  private getKeyPath(node: SyntaxNode, input: Input): string[] | null {
    const keyPath: string[] = [];

    for (
      let currentNode: SyntaxNode | null = node;
      currentNode != null;
      currentNode = currentNode.parent
    ) {
      if (currentNode.name === 'Key') {
        return null;
      }
      if (currentNode.name === 'Item') {
        keyPath.unshift('#');
      }
      else if (currentNode.name === 'Pair') {
        const keyNode: SyntaxNode | null = currentNode.getChild('Key');
        let keyText: string = '';

        if (keyNode != null) {
          keyText = input.read(keyNode.from, keyNode.to);
        }

        const keyName: string = keyText.replace(/^(['"])(.*)\1$/s, '$2');
        keyPath.unshift(keyName);
      }
    }
    return keyPath;
  }

  /**
   * Checks if a YAML key path corresponds to a formula.
   * @param keyPath - YAML keys, with '#' for list items.
   * 
   * @returns Whether or not the value should be parsed as a formula.
   */
  private isFormulaPath(keyPath: string[]): boolean {
    const rootKey: string | undefined = keyPath[0];

    const isFormulaDefinition: boolean = rootKey === 'formulas' && keyPath.length === 2;

    const isSummaryDefinition: boolean = rootKey === 'summaries' && keyPath.length === 2;

    if (isFormulaDefinition === true || isSummaryDefinition === true) {
      return true;
    }

    if (rootKey === 'filters') {
      return true;
    }

    const isViewFilter: boolean = (rootKey === 'views') && (keyPath[1] === '#') && (keyPath[2] === 'filters');
    if (isViewFilter === true){
      return true;
    }

    return false;
  }
}
