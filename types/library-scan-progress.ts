/** UI snapshot while the local library scan is running or finishing. */
export type LibraryScanProgress = {
  percent: number;
  label: string;
  rootName: string | null;
  filesDone: number;
  filesTotal: number;
};
