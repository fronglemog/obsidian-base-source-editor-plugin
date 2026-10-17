/* ========================= IMPORTS ========================= */
import type {
  ChangeSpec
} from '@codemirror/state';

/**
 * Finds a single replacement that transforms the current text into
 * the incoming text, excluding their shared prefix and suffix.
 *
 * @param currentData - The CodeMirror editor's current document data.
 * @param incomingData - Replacement data, with normalised line endings.
 * @returns The change to apply to the Editor document, or null if `currentData` is the same as `incomingData`.
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
