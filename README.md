# Lightning Blits VS Code extension

This is the official VSCode extension for the Lightning Blits framework.

Blits is a **lightweight, high-performance frontend framework** for **Lightning 3 applications**. This VSCode extension enhances the development experience by providing **rich language support** for Blits templates, components, and the `.blits` file format.

## Features

### **1. Syntax Highlighting**
- Full support for Blits template syntax inside JavaScript and TypeScript files.
- Dedicated syntax highlighting for `.blits` files, including **script and template sections**.

### **2. Code Completion (IntelliSense)**
- Auto-suggestions for Blits **component names, attributes, and built-in directives**.
- Supports both built-in and custom components inside **template strings and `.blits` files**.
- Provides **context-aware** suggestions based on cursor position.

### **3. Commenting Support**
- Enables **HTML-style commenting/uncommenting** for template sections.
- Uses `<!-- -->` for templates and `//` for script sections.

### **4. Custom `.blits` File Support**
- Full **language support** for `.blits` files:
  - **Syntax highlighting**
  - **IntelliSense** for template and script sections
  - **Signature help** for component methods
  - **Hover information** for component props and attributes
  - **Error diagnostics** for template syntax

### **5. Code Formatting**
- Automatic formatting of **Blits template strings** inside JS/TS files.
- Auto-formats **entire `.blits` files on save**.
- Configurable **Prettier-based** formatting settings.

You can disable the auto-formatting feature by setting the `blits.autoFormat` configuration option to `false`.

The extension provides several configuration options to customize the auto-formatting feature. These settings allow you to tailor the formatting to your coding style and preferences.

#### Available Settings

###### Print Width (`blits.format.printWidth`): 120
The line length that the printer will wrap on.

###### Tab Width (`blits.format.tabWidth`): 2
Indentation size.

###### Indent with Tabs (`blits.format.useTabs`): `false`
When `true`, indents with tabs instead of spaces.

###### Print Semicolons (`blits.format.semi`): `false`
Print semicolons at the ends of statements.

###### Use Single Quotes (`blits.format.singleQuote`): `true`
Use single quotes instead of double quotes.

###### Quoting Props (`blits.format.quoteProps`): `as-needed`
When `as-needed`, adds quotes around object properties where required.
When `consistent`, adds quotes around object properties where required, but only if your file contains a mix of quoted and unquoted properties.
When `preserve`, keeps object properties unquoted.

###### Trailing Comma (`blits.format.trailingComma`): `all`
When `all`, adds trailing commas wherever possible.
When `none`, removes trailing commas.
When `es5`, adds trailing commas wherever possible, but avoids adding trailing commas to function parameters.

###### Bracket Spacing (`blits.format.bracketSpacing`): `true`
Print spaces between brackets in object literals.

###### Bracket Same Line (`blits.format.bracketSameLine`): `false`
Put the `>` of a multi-line tag at the end of the last line instead of being alone on the next line.

#### Customizing Settings

To customize these settings, you can either modify the `.vscode/settings.json` file directly or use the VSCode settings UI. To do this using the settings UI, follow these steps:

- Open your VSCode settings (either user or workspace settings).
- Search for `Blits` to find all the relevant settings for the Blits extension.
- Modify the settings as needed. Changes will be applied immediately.


## Usage
Once installed, the extension will automatically detect and provide **language support** for:
- `.blits` files.
- Blits templates inside JavaScript and TypeScript files in Blits apps.

### **Commands & Shortcuts**
- **Toggle Comment** (`Ctrl + /` / `Cmd + /` on Mac): Comment/uncomment Blits template sections.

## Feedback & Contributions
This extension is **open-source**. If you encounter issues or have feature requests, please visit the [GitHub Repository](https://github.com/lightning-js/blits-vscode-extension) and submit an issue or contribute to the codebase.

---

**Enhance your Blits development experience today! 🚀**
