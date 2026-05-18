/** Runtime scan walk options derived from library scan preferences. */
export type ScanTreeOptions = {
  maxScanDepth: number;
  followSymlinks: boolean;
  enabledExtensions: ReadonlySet<string>;
};
