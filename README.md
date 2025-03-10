# Lightning Blits VS Code extension

This is the official VSCode extension for the Lightning Blits framework.

Blits is a **lightweight, high-performance frontend framework** for **Lightning 3 applications**. This VSCode extension enhances the development experience by providing **rich language support** for Blits templates, components, and the `.blits` file format.

## Usage

Once installed, the extension will automatically detect and provide **language support** for:
- `.blits` files.
- Blits templates inside JavaScript and TypeScript files in Blits apps.

### **Commands & Shortcuts**

- **Toggle Comment** (`Ctrl + /` / `Cmd + /` on Mac): Comment/uncomment Blits template sections.

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

### **5. Code Snippets**

Enhance your coding efficiency with built-in snippets for Blits development. These snippets provide templates for common structures and patterns in Blits applications, helping you write code more quickly and consistently across JavaScript, TypeScript, and `.blits` files.

| Snippet Prefix | Description |
|----------------|-------------|
| `blits-file` | Creates a basic `.blits` file structure with template and script sections |
| `blits-component` | Scaffolds a complete Blits component structure in JS/TS files |
| `blits-input` | Adds customizable input handler methods with selectable key options |
| `blits-input-block` | Inserts a complete input object with handlers for all common keys |
| `blits-hooks` | Adds individual lifecycle hook methods with method selection |
| `blits-hooks-block` | Inserts all major lifecycle hooks at once (init, ready, focus, unfocus, destroy) |
| `blits-attribute-transition` | Creates attribute transition syntax for animations in template strings |

### **6. Code Formatting**

- Automatic formatting of **Blits template strings** inside JS/TS files.
- Auto-formats **entire `.blits` files on save**.
- Configurable **Prettier-based** formatting settings.

You can disable the auto-formatting feature by setting the `blits.autoFormat` configuration option to `false`.

#### Available Settings

The extension provides several configuration options to customize the formatting experience:

| Setting | Default | Description |
|---------|---------|-------------|
| `blits.format.printWidth` | `120` | The line length that the printer will wrap on |
| `blits.format.tabWidth` | `2` | Indentation size |
| `blits.format.useTabs` | `false` | When `true`, indents with tabs instead of spaces |
| `blits.format.semi` | `false` | Print semicolons at the ends of statements |
| `blits.format.singleQuote` | `true` | Use single quotes instead of double quotes |
| `blits.format.quoteProps` | `as-needed` | Controls when to quote object properties:<br>• `as-needed`: Only when required<br>• `consistent`: If any property requires quotes<br>• `preserve`: Respects original formatting |
| `blits.format.trailingComma` | `all` | Controls trailing commas:<br>• `all`: Add wherever possible<br>• `none`: Remove all trailing commas<br>• `es5`: Add except in function parameters |
| `blits.format.bracketSpacing` | `true` | Print spaces between brackets in object literals |
| `blits.format.bracketSameLine` | `false` | Put the `>` of a multi-line tag at the end of the last line |

#### Customizing Settings

To customize these settings:

1. Open VSCode settings (File > Preferences > Settings or `Ctrl+,` / `Cmd+,` on Mac)
2. Search for `Blits` to find all relevant settings
3. Modify as needed - changes will be applied immediately

You can also edit the `.vscode/settings.json` file directly to configure these options.

## Feedback & Contributions

This extension is **open-source**. If you encounter issues or have feature requests, please visit the [GitHub Repository](https://github.com/lightning-js/blits-vscode-extension) and submit an issue or contribute to the codebase.

---

**Enhance your Blits development experience today! 🚀**
