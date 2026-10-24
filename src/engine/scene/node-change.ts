// Old: chunk.vendor.js module 2 (GNode.Flag, GNode._Change).
/**
 * The node flags and change codes. They live in their own file so the
 * node mixins can use them without importing node.ts at runtime (node.ts
 * imports the mixins).
 *
 * Flag bits are saved by some callers and the change codes are what every
 * `_handleChange` override switches on, so the numbers are kept exactly.
 */

/** GNode.Flag. GElement.Flag adds the bits from 1 << 21 up. */
export const NodeFlag = {
  Selected: 2,
  Highlighted: 4,
  Active: 8,
  Transient: 16,
  Expanded: 32,
} as const;

/** GNode._Change. Subclasses add their own ranges (scene-node 200, element 210-260). */
export const NodeChange = {
  BeforeChildInsert: 1,
  AfterChildInsert: 2,
  BeforeChildRemove: 10,
  AfterChildRemove: 11,
  BeforePropertiesChange: 20,
  AfterPropertiesChange: 21,
  BeforeFlagChange: 30,
  AfterFlagChange: 31,
  ParentAttached: 40,
  ParentDetach: 41,
  PrepareStore: 50,
  Store: 51,
  PrepareRestore: 52,
  Restore: 53,
  WorkspaceAttached: 60,
  WorkspaceDetach: 61,
} as const;
