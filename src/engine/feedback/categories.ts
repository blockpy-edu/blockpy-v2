// Feedback severity/category taxonomy (docs/architecture/05 §4, Story 8.1).

export type FeedbackCategory =
  | 'syntax'
  | 'runtime'
  | 'analyzer'
  | 'instructor'
  | 'success'
  | 'partial'
  | 'system'
  | 'none';

/** Precedence: higher number wins when multiple sources produce feedback. */
export const CATEGORY_PRIORITY: Record<FeedbackCategory, number> = {
  system: 70,
  syntax: 60,
  instructor: 50,
  runtime: 40,
  analyzer: 30,
  success: 20,
  partial: 10,
  none: 0,
};

/**
 * Friendly explanations for common Python error classes (Story 8.3,
 * ported from the legacy "pretty errors" tables).
 */
export const FRIENDLY_ERROR_HINTS: Record<string, string> = {
  NameError:
    'You used a name that has not been defined yet. Check for typos, and make sure you assign a value to the variable before using it.',
  TypeError:
    'An operation was applied to a value of the wrong type. Check that you are not mixing incompatible types (like adding a string to a number).',
  ValueError:
    'A function received a value of the right type but an inappropriate value (like int("hello")).',
  ZeroDivisionError: 'Your code divided a number by zero, which is undefined.',
  IndexError:
    'You tried to access a position in a list (or string) that does not exist. Remember positions start at 0.',
  KeyError: 'You tried to look up a key that is not in the dictionary.',
  AttributeError:
    'You tried to use a method or property that this value does not have. Check the type of the value and the spelling.',
  IndentationError:
    'The indentation of your code is inconsistent. Make sure nested lines are indented the same amount.',
  SyntaxError:
    'Python could not understand this line. Check for missing colons, parentheses, or quotation marks.',
  ImportError: 'Python could not find the module you tried to import. Check the spelling.',
  ModuleNotFoundError: 'Python could not find the module you tried to import. Check the spelling.',
  RecursionError:
    'Your function called itself too many times. Make sure recursive functions have a base case that stops.',
  FileNotFoundError: 'Your code tried to open a file that does not exist.',
};
