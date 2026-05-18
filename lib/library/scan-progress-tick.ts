/** Internal progress event emitted while scanning one or more library roots. */
export type ScanProgressTick = {
  rootIndex: number;
  rootCount: number;
  rootName: string;
  phase: "walk" | "metadata";
  filesDone?: number;
  filesTotal?: number;
  filesSkipped?: number;
};
