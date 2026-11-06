/*
This script is run by `npm version` after `package.json` has been bumped. It:
1. Sets `version` in `manifest.json` to the new package version.
2. Adds a `version: minAppVersion` entry to `versions.json` if it is not already there.

It can also be run directly (`tsx scripts/version-bump.ts`), in which case the version is read from `package.json`.
*/
/* ========================= IMPORTS ========================= */
import path from 'node:path';

import { readPluginManifest, readJson, writeJson, getPackageVersion } from '#scripts/_util';
import type { SemverString } from '#scripts/_util';

/* ================================================= */
const REPO_ROOT = path.resolve(import.meta.dirname, '..');

const packageJsonFilePath = path.resolve(REPO_ROOT, 'package.json');
const pluginManifestFilePath = path.resolve(REPO_ROOT, 'manifest.json');
const pluginVersionsFilePath = path.resolve(REPO_ROOT, 'versions.json');

const targetVersion = getPackageVersion(packageJsonFilePath);

// bump version in manifest.json to target version
const manifest = readPluginManifest(pluginManifestFilePath);
manifest.version = targetVersion;

writeJson(pluginManifestFilePath, manifest, true);
updateVersions(pluginVersionsFilePath, targetVersion, manifest.minAppVersion);

/* ================================================= */

/**
 * Add the target version to versions.json with the minAppVersion from manifest.json,
 * but only if the target version is not already in versions.json
 * 
 * @param path - Path to the plugin's `versions.json` file.
 * @param version - Plugin version.
 * @param minAppVersion - Minimum Obsidian version compatible with the plugin.
 */
function updateVersions(path: string, version: SemverString, minAppVersion: SemverString): void {
  type PluginVersions = Record<SemverString, SemverString>;

  const pluginVersions = readJson<PluginVersions>(path);

  if (!Object.hasOwn(pluginVersions, version)) {
    pluginVersions[version] = minAppVersion;
    writeJson(path, pluginVersions, true);
  }
}
