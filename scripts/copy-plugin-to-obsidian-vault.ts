/*
This script copies the latest plugin build into an Obsidian vault.

Usage: `pnpm run copy-to-obsidian "<VAULT_PATH>"`

It copies `build/main.js`, `manifest.json` and `styles/styles.css` into `<vault>/.obsidian/plugins/<PLUGIN_ID>`.
<PLUGIN_ID> is the `id` read from `manifest.json`.

It creates the plugin folder if it doesn't exist, and overwrites any copies of those three files already in it.
Other files in the folder, such as the plugin's saved settings in `data.json`, are left alone.

Run a build first. This script copies whatever is in `build/` and doesn't build anything itself.
*/
/* ========================= IMPORTS ========================= */
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { styleText } from 'node:util';

import { readPluginManifest } from '#scripts/_util';

/* ================================================= */
const obsidianVaultPath = process.argv[2];

if (obsidianVaultPath == null || obsidianVaultPath === '') {
  throw new Error('No vault path given. Usage: pnpm run copy-to-obsidian "<VAULT_PATH>"');
}

const REPO_ROOT = path.resolve(import.meta.dirname, '..');

const PLUGIN_FILE_PATHS = {
  mainJs: path.resolve(REPO_ROOT, 'build/main.js'),
  manifest: path.resolve(REPO_ROOT, 'manifest.json'),
  styles: path.resolve(REPO_ROOT, 'styles/styles.css'),
} as const;

const vaultPath = path.resolve(obsidianVaultPath);

const pluginManifest = readPluginManifest(PLUGIN_FILE_PATHS.manifest);
const pluginPathInObsidianVault = path.resolve(vaultPath, '.obsidian', 'plugins', pluginManifest.id);

assertPathIsObsidianVault(vaultPath);
assertAllFilesExist(Object.values(PLUGIN_FILE_PATHS));

mkdirSync(pluginPathInObsidianVault, { recursive: true });

console.log(styleText('green', '\n===== Copying plugin files to Obsidian vault ====='));
console.log(styleText('yellow', 'Destination:'), styleText('cyan', `${pluginPathInObsidianVault}\n`));

for (const filePath of Object.values(PLUGIN_FILE_PATHS)) {
  const fileName: string = path.basename(filePath);

  const destinationPath: string = path.join(pluginPathInObsidianVault, fileName);
  copyFileSync(filePath, destinationPath);

  console.log(styleText('cyan', `${path.relative(REPO_ROOT, filePath)}`), styleText('green', '-->'), styleText('cyan', `${fileName}`));
}

console.log('');

/* ================================================= */

/**
 * Throws an error if `vaultPath` isn't a folder, or if it has no `.obsidian` folder inside it.
 *
 * @remarks
 * Every Obsidian vault has a `.obsidian` folder. Checking for it stops a mistyped path
 * from creating a new `.obsidian/plugins` folder somewhere that isn't a vault.
 */
function assertPathIsObsidianVault(folderPath: string): void {
  if (!existsSync(folderPath) || !statSync(folderPath).isDirectory()) {
    throw new Error(`Vault folder not found: ${folderPath}`);
  }

  const obsidianConfigPath = path.join(folderPath, '.obsidian');
  if (!existsSync(obsidianConfigPath)) {
    throw new Error(`${folderPath} is not an Obsidian vault, because it has no .obsidian folder`);
  }
}

/**
 * Throws an error if any of `filePaths` is missing, listing every missing file in the error message.
 */
function assertAllFilesExist(filePaths: string[]): void {
  const missingFilePaths = filePaths.filter((filePath) => !existsSync(filePath));

  if (missingFilePaths.length > 0) {
    throw new Error(
      `Missing plugin files: ${missingFilePaths.join(', ')}.`,
    );
  }
}
