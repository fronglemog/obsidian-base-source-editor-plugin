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
import { getPluginManifest } from './script-lib';

/* ================================================= */
const obsidianVaultPath = process.argv[2];
const pluginManifest = getPluginManifest();

const pluginFilePaths = {
  mainJs: 'build/main.js',
  manifest: 'manifest.json',
  styles: 'styles/styles.css',
};

if (obsidianVaultPath == null || obsidianVaultPath === '') {
  throw new Error('No vault path given. Usage: pnpm run copy-to-obsidian "<VAULT_PATH>"');
}

const pluginPathInObsidianVault = path.join(obsidianVaultPath, '.obsidian', 'plugins', `${pluginManifest.id}`);

checkIsObsidianVault(obsidianVaultPath);
checkPluginFilesExist(Object.values(pluginFilePaths));

mkdirSync(pluginPathInObsidianVault, { recursive: true });

for (const filePath of Object.values(pluginFilePaths)) {
  const destinationPath = path.join(pluginPathInObsidianVault, path.basename(filePath));
  copyFileSync(filePath, destinationPath);
  console.log(`Copied ${filePath} -> ${destinationPath}`);
}

/* ================================================= */

/**
 * Exits with an error if `vaultPath` isn't a folder, or if it has no `.obsidian` folder inside it.
 *
 * @remarks
 * Every Obsidian vault has a `.obsidian` folder. Checking for it stops a mistyped path
 * from creating a new `.obsidian/plugins` folder somewhere that isn't a vault.
 */
function checkIsObsidianVault(vaultPath: string): void {
  if (!existsSync(vaultPath) || !statSync(vaultPath).isDirectory()) {
    throw new Error(`Vault folder not found: ${vaultPath}`);
  }

  const obsidianConfigPath = path.join(vaultPath, '.obsidian');
  if (!existsSync(obsidianConfigPath)) {
    throw new Error(`${vaultPath} is not an Obsidian vault, because it has no .obsidian folder`);
  }
}

/**
 * Throws if any of `filePaths` is missing, listing every missing file in the error message.
 */
function checkPluginFilesExist(filePaths: string[]): void {
  const missingFilePaths = filePaths.filter((filePath) => !existsSync(filePath));

  if (missingFilePaths.length > 0) {
    throw new Error(
      `Missing plugin files: ${missingFilePaths.join(', ')}.`,
    );
  }
}
