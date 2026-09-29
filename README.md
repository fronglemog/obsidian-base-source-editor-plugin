# Base Source Editor

This is a plugin for [Obsidian](https://obsidian.md) that provides a 'source mode' for editing [Bases](https://obsidian.md/help/bases).

This plugin adds a new **Base Source mode** view for editing the YAML source code of Bases directly within Obsidian. 

## Features

- Edit Base files as plain-text YAML without leaving Obsidian.
- Search/replace, mirroring Obsidian's native behaviour. Supports case-sensitive search!
	- The search/replace command is accessed the same way as for native Markdown notes, either from the Command palette or the file menu.
- Theme-aware YAML syntax highlighting, utilising Obsidian's built-in CSS variables.
- Full mobile support.

View the [Roadmap](./ROADMAP.md) to see planned features.

## Usage

Base Source mode can be toggled using:
- The command 'Toggle source mode' from the Command palette.
- The 'Source mode/Base mode' toggle visible when a Base is open.

## Installation

### Obsidian Community Directory

1. Go to the plugin page on the community directory [here](https://community.obsidian.md/plugins/base-source-editor).
2. Click `Add to Obsidian`.

### Inside Obsidian

1. Open the plugin browser inside Obsidian, and search for `base source editor`.
2. Select the `Base Source Editor` plugin.
3. Click `Install`.

## Developing

This project uses [pnpm](https://pnpm.io) as its package manager instead of `npm`.

1. [Install pnpm](https://pnpm.io/installation).
2. Clone this repo:
   
   ```
	 git clone https://github.com/fronglemog/obsidian-base-source-editor-plugin
	 ```
3. Run `pnpm install` to install dependencies.

## Contributing

I'm more than happy to accept feedback, issues, bug reports and pull requests.

### AI policy

I use AI as a tool to support my learning and development. I welcome those who identify and raise issues or submit pull requests who have done so with considered and appropriate use of AI.

However, AI **slop** is not welcome here. Issues or pull requests written or submitted by AI agents are not welcome here.

I reserve the right to decline and reject any issues or pull requests that I judge to be **AI slop**. Judgement of issues or pull requests as **AI slop** will be made at my sole discretion, without mercy. 

## License

[MIT](./LICENSE) © fronglemog