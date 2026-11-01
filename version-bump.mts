/*
This script is run by `npm version` after `package.json` has been bumped. It:
1. Sets `version` in `manifest.json` to the new package version.
2. Adds a `version: minAppVersion` entry to `versions.json` if it is not already there.

It can also be run directly (`tsx version-bump.mts`), in which case the version is read from `package.json`.
*/

import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const targetVersion = getTargetVersion();

// bump version in manifest.json to target version
const manifest = getPluginManifest();
manifest.version = targetVersion;
writeJson('manifest.json', manifest);

updateVersions(targetVersion, manifest.minAppVersion);

/* ================================================= */
function readJson<T>(path: string): T {
  const jsonParse = JSON.parse(readFileSync(path, 'utf8')) as T;
  return jsonParse;
}

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2));
}

function isSemverString(value: string): value is SemverString {
  return /^\d+\.\d+\.\d+$/.test(value);
}

function getTargetVersion(): SemverString {
  const version = process.env.npm_package_version ?? getPackageJson().version;

  if (!isSemverString(version)) {
    throw new Error(`Invalid version "${version}", expected the format x.y.z`);
  }
  return version;
}

function getPackageJson(): PackageJson {
  const packageJsonFilePath = 'package.json';
  const packageJson = readJson<PackageJson>(packageJsonFilePath);
  return packageJson;
}

function getPluginManifest(): PluginManifest {
  const manifestFilePath = 'manifest.json';
  const manifest = readJson<PluginManifest>(manifestFilePath);
  return manifest;
}

/**
 * Add the target version to versions.json with the minAppVersion from manifest.json,
 * but only if the target version is not already in versions.json
 */
function updateVersions(version: SemverString, minAppVersion: SemverString): void {
  type PluginVersions = Record<SemverString, SemverString>;

  const versionsFilePath = 'versions.json';
  const pluginVersions = readJson<PluginVersions>(versionsFilePath);

  if (!Object.hasOwn(pluginVersions, version)) {
    pluginVersions[version] = minAppVersion;
    writeJson(versionsFilePath, pluginVersions);
  }
}

interface PackageJson {
  /**
   * The package version, using {@link https://semver.org} in the format x.y.z
   */
  version: string;
}

type SemverString = `${number}.${number}.${number}`;

interface PluginManifest {
  /**
   * The plugin version, using {@link https://semver.org} in the format x.y.z
   */
  version: SemverString;

  /**
   * The minimum required Obsidian version in the format x.y.z
   */
  minAppVersion: SemverString;
}
