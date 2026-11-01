# Base Source Editor

An [Obsidian](https://obsidian.md) plugin that adds a feature-rich text editor for editing the YAML source code of [Bases](https://obsidian.md/help/bases).

## Features

- **Text editor for `.base` files**
	- Open a Base (`.base` file extension) in the **Base Source Editor**, and edit the raw YAML source code without leaving the Obsidian app.
	- Supports editor commands including:
		- Undo/redo
		- Indent/unindent
		- Move line up/down
		- Delete current line
- **Autocompletion**
	- Suggests keys, values and formulas as you type.
	- Suggests property names from your vault, file properties, and the Base's own formulas.
	- Formula suggestions and function hints work the same as Obsidian's native formula editor.
	- Show suggestions at any time with `Ctrl+Space`, or with the **Show suggestions** command.
	- Choose which key accepts a suggestion: `Enter`, `Tab`, or both.
- **Syntax highlighting**
	- Theme-aware YAML syntax highlighting, utilising Obsidian's built-in CSS variables.
- **Search & replace**
	- Supports case-sensitive search.
- **Customisable appearance**
	- Editor font size
	- Line wrapping and readable line length
	- Indentation guides
	- Rendering of whitespace characters (spaces, tabs)
- **Mobile command toolbar**
	- Configurable command toolbar on mobile devices.

View the [Roadmap](./ROADMAP.md) to see planned features.

## Installation

### Requirements

- Obsidian version: `1.14.4+`
- Bases core plugin must be **enabled**

### Obsidian Community Directory

1. Go to the plugin page on the [Obsidian community directory](https://community.obsidian.md/plugins/base-source-editor).
2. Click `Add to Obsidian`.

### Inside Obsidian

1. Open the community plugin browser inside Obsidian, and search for `base source editor`.
2. Select the `Base Source Editor` plugin.
3. Click `Install`.

## Usage

A Base can be opened in the Base Source Editor by:
- Using the command 'Toggle source mode' from the Command palette,
- Using the 'Source mode/Base mode' toggle visible when a Base is open.

## Developing

### Requirements

- Node.js: Version `24.22.2` or newer
- pnpm: Version `12.14.0` or newer
	- See here for pnpm installation instructions: [Install pnpm](https://pnpm.io/installation)

This project uses the [pnpm](https://pnpm.io) package manager instead of `npm`.

1. [Install pnpm](https://pnpm.io/installation).
2. Clone this repo:

	```sh
	git clone https://github.com/fronglemog/obsidian-base-source-editor-plugin
	cd obsidian-base-source-editor-plugin
	```

3. Run command `pnpm install` to install dependencies.

### Linting

Lint using `pnpm run lint`.

### Testing

Run tests with `pnpm run test`.

### Building

New builds are created at `build/main.js`.

| Command                        | Type checks | Minified               | Watches for changes |
| ------------------------------ | ----------- | ---------------------- | ------------------- |
| `pnpm run build`               | yes         | yes                    | no                  |
| `pnpm run build:nocheck`       | no          | yes                    | no                  |
| `pnpm run build:nocheck:watch` | no          | yes                    | yes                 |
| `pnpm run dev`                 | no          | no (inline source map) | no                  |
| `pnpm run dev:watch`           | no          | no (inline source map) | yes                 |

After creating a new build, copy the `build/main.js`, `styles/styles.css` and `manifest.json` to your Obsidian vault using this command, replacing `<VAULT_PATH>` with the full/absolute path to the folder containing your Obsidian vault.

Re-run this command after every build, then reload the plugin in Obsidian.

(If your vault does not contain an `.obsidian` folder, the command will fail.)

```sh
pnpm run copy-to-obsidian <VAULT_PATH>
```

For example:
- `pnpm run copy-to-obsidian "C:\Users\fronglemog\Documents\MyVault"`
- `pnpm run copy-to-obsidian ~/Documents/MyVault`

## Contributing

I'm more than happy to accept feedback, issues, bug reports and pull requests.

### AI policy

I use AI as a tool to support development. I welcome contributions or feedback from those who have done so with considered and appropriate use of AI.

However, AI **slop** is not welcome. Contributions 100% authored or submitted by AI agents are not welcome.

I reserve the right to decline, reject or otherwise ignore any contributions that I judge to be **AI slop**.

## License

[MIT](./LICENSE) © fronglemog