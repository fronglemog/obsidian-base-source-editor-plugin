/* ========================= IMPORTS ========================= */
import { readFileSync, writeFileSync } from 'node:fs';

/* ================================================= */
export function readJson<T>(filePath: string): T {
  const jsonParse = JSON.parse(readFileSync(filePath, 'utf8')) as T;
  return jsonParse;
}

export function writeJson(filePath: string, data: unknown, endWithNewLine: boolean): void {
  const json = JSON.stringify(data, null, 2);

  if (endWithNewLine) {
    writeFileSync(filePath, `${json}\n`);
  }
  else {
    writeFileSync(filePath, json);
  }
}

const REGEXP_SEMVER_STRING: RegExp = /^\d+\.\d+\.\d+$/;

export function isSemverString(value: string): value is SemverString {
  return REGEXP_SEMVER_STRING.test(value);
}

/**
 * 
 * @param filePath - Path to a `package.json` file.
 * @returns 
 */
export function readPackageJson(filePath: string): PackageJson {
  const packageJson = readJson<PackageJson>(filePath);
  return packageJson;
}

/**
 * 
 * @param filePath - Path to the plugin's `package.json` file.
 * @returns 
 */
export function getPackageVersion(filePath: string): SemverString {
  const packageVersion = process.env.npm_package_version ?? readPackageJson(filePath).version;

  if (!isSemverString(packageVersion)) {
    throw new Error(`Invalid version "${packageVersion}", expected the format x.y.z`);
  }
  return packageVersion;
}

/**
 * 
 * @param filePath - Path to the plugin's `manifest.json` file.
 * @returns 
 */
export function readPluginManifest(filePath: string): PluginManifest {
  const pluginManifest = readJson<PluginManifest>(filePath);
  return pluginManifest;
}

export interface PackageJson {
  /**
   * The package version, using {@link https://semver.org} in the format x.y.z
   */
  version: string;
}

export type SemverString = `${number}.${number}.${number}`;

export interface PluginManifest {
  /**
   * The plugin ID.
   */
  id: string;

  /**
   * The plugin version, using {@link https://semver.org} in the format x.y.z
   */
  version: SemverString;

  /**
   * The minimum required Obsidian version in the format x.y.z
   */
  minAppVersion: SemverString;
}
