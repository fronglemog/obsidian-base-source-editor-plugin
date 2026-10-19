/* ========================= IMPORTS ========================= */
/* CODEMIRROR */
import type {
  ChangeSpec
} from '@codemirror/state';

/* ============================================================ */

/**
 * Describes the change to apply to the current text, to match into the incoming text.
 *
 * @param currentData - The editor's current document text.
 * @param incomingData - The new text, with normalised line endings.
 * @returns The change to apply to the editor's document, or `null` if the texts are the same.
 */
export function getDocumentChange(currentData: string, incomingData: string): ChangeSpec | null {
  if (currentData === incomingData) {
    return null;
  }

  let changeStart: number = 0;

  const sharedLength: number = Math.min(
    currentData.length,
    incomingData.length
  );

  while (
    changeStart < sharedLength &&
    currentData[changeStart] === incomingData[changeStart]
  ) {
    changeStart++;
  }

  let currentChangeEnd: number = currentData.length;
  let incomingChangeEnd: number = incomingData.length;

  while (
    currentChangeEnd > changeStart &&
    incomingChangeEnd > changeStart &&
    currentData[currentChangeEnd - 1] === incomingData[incomingChangeEnd - 1]
  ) {
    currentChangeEnd--;
    incomingChangeEnd--;
  }

  const replacementData: string = incomingData.slice(changeStart, incomingChangeEnd);
  const documentChange: ChangeSpec = {
    from: changeStart,
    to: currentChangeEnd,
    insert: replacementData
  };

  return documentChange;
}
