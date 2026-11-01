/*
This script is run by `npm version` after `package.json` has been bumped. It:
1. Sets `version` in `manifest.json` to the new package version.
2. Adds a `version: minAppVersion` entry to `versions.json` if it is not already there.

It can also be run directly (`tsx scripts/version-bump.ts`), in which case the version is read from `package.json`.
*/
/* ========================= IMPORTS ========================= */
import { getPackageJson, getPluginManifest, isSemverString, readJson, writeJson } from './script-lib';
import type { SemverString } from './script-lib';

import process from 'node:process';

/* ================================================= */

const targetVersion = getTargetVersion();

// bump version in manifest.json to target version
const manifest = getPluginManifest();
manifest.version = targetVersion;
writeJson('manifest.json', manifest, true);

updateVersions(targetVersion, manifest.minAppVersion);

/* ================================================= */
function getTargetVersion(): SemverString {
  const version = process.env.npm_package_version ?? getPackageJson().version;

  if (!isSemverString(version)) {
    throw new Error(`Invalid version "${version}", expected the format x.y.z`);
  }
  return version;
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
    writeJson(versionsFilePath, pluginVersions, true);
  }
}
