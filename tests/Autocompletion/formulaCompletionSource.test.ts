/* ========================= IMPORTS ========================= */
import {
  describe,
  expect,
  test,
  vi
} from 'vitest';

/* OBSIDIAN */
import type { Platform } from 'obsidian';


import { setIsPhoneFalseAndCall } from 'src/Autocompletion/formulaCompletionSource';

/* ========================= HELPERS ========================= */

/**
 * Stands in for a function that fails.
 */
function throwTestError(): never {
  throw new Error('Test error');
}

/* ========================= TESTS ========================= */

describe('setIsPhoneFalseAndCall', () => {
  test('on a phone, runs with isPhone false, then puts it back', () => {
    const platform = { isPhone: true } as typeof Platform;
    const onSetIsPhoneFalseError = vi.fn<(error: unknown) => void>();

    const isPhoneDuringRun: boolean = setIsPhoneFalseAndCall(platform, (): boolean => platform.isPhone, onSetIsPhoneFalseError);

    expect(isPhoneDuringRun).toBe(false);
    expect(platform.isPhone).toBe(true);
    expect(onSetIsPhoneFalseError).not.toHaveBeenCalled();
  });

  test('puts isPhone back when the function throws', () => {
    const platform = { isPhone: true } as typeof Platform;
    const onSetIsPhoneFalseError = vi.fn<(error: unknown) => void>();

    expect(() => setIsPhoneFalseAndCall(platform, throwTestError, onSetIsPhoneFalseError)).toThrow('Test error');
    expect(platform.isPhone).toBe(true);
  });

  test('not on a phone, runs with isPhone unchanged', () => {
    const platform = { isPhone: false } as typeof Platform;
    const onSetIsPhoneFalseError = vi.fn<(error: unknown) => void>();

    const isPhoneDuringRun: boolean = setIsPhoneFalseAndCall(platform, (): boolean => platform.isPhone, onSetIsPhoneFalseError);

    expect(isPhoneDuringRun).toBe(false);
    expect(platform.isPhone).toBe(false);
    expect(onSetIsPhoneFalseError).not.toHaveBeenCalled();
  });

  test('if isPhone is read-only, runs with it unchanged and reports it', () => {
    const platform= Object.freeze({ isPhone: true } as typeof Platform);
    const onSetIsPhoneFalseError = vi.fn<(error: unknown) => void>();

    const isPhoneDuringRun: boolean = setIsPhoneFalseAndCall(platform, (): boolean => platform.isPhone, onSetIsPhoneFalseError);

    expect(isPhoneDuringRun).toBe(true);
    expect(onSetIsPhoneFalseError).toHaveBeenCalledOnce();
  });

  test('if setting isPhone has no effect, runs with it unchanged and reports it', () => {
    const platform = {
      get isPhone(): boolean {
        return true;
      },
      set isPhone(value: boolean) {
        void value;
      }
    } as typeof Platform;
    const onSetIsPhoneFalseError = vi.fn<(error: unknown) => void>();

    const isPhoneDuringRun: boolean = setIsPhoneFalseAndCall(platform, (): boolean => platform.isPhone, onSetIsPhoneFalseError);

    expect(isPhoneDuringRun).toBe(true);
    expect(onSetIsPhoneFalseError).toHaveBeenCalledOnce();
  });
});
