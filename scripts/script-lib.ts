/* ========================= IMPORTS ========================= */
import { readFileSync, writeFileSync } from 'node:fs';

/* ================================================= */
export function readJson<T>(path: string): T {
  const jsonParse = JSON.parse(readFileSync(path, 'utf8')) as T;
  return jsonParse;
}

export function writeJson(path: string, data: unknown, endWithNewLine: boolean): void {
  const json = JSON.stringify(data, null, 2);

  if (endWithNewLine) {
    writeFileSync(path, `${json}\n`);
  }
  else {
    writeFileSync(path, json);
  }
}

const REGEXP_SEMVER_STRING: RegExp = /^\d+\.\d+\.\d+$/;

export function isSemverString(value: string): value is SemverString {
  return REGEXP_SEMVER_STRING.test(value);
}

export function getPackageJson(): PackageJson {
  const packageJsonFilePath = 'package.json';
  const packageJson = readJson<PackageJson>(packageJsonFilePath);
  return packageJson;
}

export function getPluginManifest(): PluginManifest {
  const manifestFilePath = 'manifest.json';
  const manifest = readJson<PluginManifest>(manifestFilePath);
  return manifest;
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
