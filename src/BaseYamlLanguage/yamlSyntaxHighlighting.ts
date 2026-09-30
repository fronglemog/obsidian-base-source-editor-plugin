/* ========================= IMPORTS ========================= */
import {
  HighlightStyle,
  syntaxHighlighting
} from '@codemirror/language';

import { tags } from '@lezer/highlight';

/* ======================================================= */

const yamlHighlightStyle = HighlightStyle.define([
  { 
    tag: tags.definition(tags.propertyName),
    color: 'var(--code-property)' 
  },
  { 
    tag: tags.string,
    color: 'var(--code-string)'
  },
  { 
    tag: tags.special(tags.string),
    color: 'var(--code-important)'
  },
  { 
    tag: tags.content,
    color: 'var(--code-normal)'
  },
  { 
    tag: tags.lineComment,
    color: 'var(--code-comment)'
  },
  { 
    tag: [tags.labelName, tags.typeName],
    color: 'var(--code-tag)'
  },
  { 
    tag: [tags.keyword, tags.meta],
    color: 'var(--code-keyword)'
  },
  { 
    tag: [tags.separator, tags.punctuation, tags.squareBracket, tags.brace],
    color: 'var(--code-punctuation)'
  },
  { 
    tag: tags.propertyName,
    class: 'token property'
  },
  { 
    tag: tags.number,
    class: 'token number'
  },
  { 
    tag: tags.arithmeticOperator,
    class: 'token operator'
  },
  { 
    tag: tags.paren,
    class: 'token punctuation'
  },
]);

export const yamlSyntaxHighlighting = syntaxHighlighting(yamlHighlightStyle);