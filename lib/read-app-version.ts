import packageJson from "../package.json";

/**
 * Application version from package.json.
 */
export default function readAppVersion(): string {
  return packageJson.version;
}
