import YTDlpWrapImport from "yt-dlp-wrap";

const YTDlpWrap = (
  (YTDlpWrapImport as unknown as { default?: typeof YTDlpWrapImport }).default ??
  YTDlpWrapImport
) as typeof YTDlpWrapImport;

export default YTDlpWrap;
