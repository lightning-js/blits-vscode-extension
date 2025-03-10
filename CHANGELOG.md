# Change Log

## v1.4.0

- Fixed syntax highlighting issue for `@updated` event attribute
- Auto file template provider for newly created `.blits` files
- Snippet support for JavaScript/TypeScript/Blits files
- Reduced the final extension size

## v1.3.0

- Template attributes are suggested based on the context and their parent tags
- Attribute suggestions provide information about each attribute/prop in an info window
- Attribute data is retrieved from the Blits repository with a local fallback option
- Component attributes override built-in attributes when they share the same name
- Selecting an attribute from suggestions automatically inserts its default value
- Event attributes (`@loaded` and `@error`) are syntax highlighted for both `.blits` and JavaScript/TypeScript files, and their expected value format is validated
- The extension features for JavaScript & TypeScript files are only enabled when the workspace contains a `package.json` file with `@lightningjs/blits` dependency. `.blits` file features are always active
- If a template has major structural errors that prevent auto formatting, the editor now underlines the entire template in red (as an error) and displays an error message when hovering over the template
- Fixed the issue where interpolated attribute names with hyphen are not highlighted correctly (fixes [#27](https://github.com/lightning-js/blits-vscode-extension/issues/27))
- Template handling has been improved. `template` properties of objects outside `Blits.Component()` calls are considered Blits templates only when they match a Blits template string format. Otherwise, they are treated as regular text, and extension features are disabled for those strings. This fixes false positive cases while parsing potential Blits template strings in JavaScript and TypeScript code.
- Syntax highlighting rules/patterns are improved for template strings in JavaScript/TypeScript files
- Fixed bugs related to auto formatting when single quotes are used for defining template strings
- Fixed the issue of displaying forward slashes in red for some self-closing tags (like `<Button />`) by improving syntax grammar rules
- Fixed code completion implementation. Suggestions for template tags and attributes are now only offered in appropriate contexts. Characters that trigger suggestions are strictly controlled. Removed duplicate items that appeared when users requested only the list of regular attributes
- Fixed bugs related to template strings that begin with HTML-style comments
- Fixed syntax highlighting for regular attribute values by ensuring proper quote matching in grammar regex in `.blits` files.

## v1.2.1

- Fixes the commenting issue in TypeScript files caused by an incompatible babel parser plugin

## v1.2.0

- Fixes an auto-formatting issue where the extension removes trailing spaces unexpectedly.
- Resolves an auto-formatting issue where extra indentation is applied to multiline attribute values on every file save.
- Addresses formatting issues for `.blits` files: template and script sections are now formatted independently. The script section respects to user-defined formatting rules configured in VS Code for the extension.
- Implements IntelliSense suggestions for template tags, supporting both built-in and custom components. (fixes #16 )

## v1.1.0

- Fixes the error displayed when a `.blits` file is imported into TS/JS files.
- Fixes commenting bugs in TS/JS files.
- Removes block-level commenting; each line is now commented out separately within template strings (TS/JS components).
- Fixes a bug that removed all empty lines in template strings.
- Fixes the json file import issue in `.blits` files.
- Fixes the extra line added after template strings by removing whitespace following the last template tag.
- Fixes AST parsing issues and adds additional Babel plugins.

## v1.0.0

- Implemented the new `.blits` file type with its own TextMate grammar file.
- Integrated existing functionality into the `.blits` file format.
- Fixed syntax highlighting issues for deprecated HTML tags and attributes. (fixes [#21](https://github.com/lightning-js/blits-vscode-extension/issues/21) )
- Added improved IntelliSense support for template attributes by parsing renderer props from the Blits codebase.
- Implemented caching for parsing renderer props to prevent performance issues.
- Included minor bug fixes and code refactoring.
- Implemented a syntax highlighting grammar file for Blits code embedded in Markdown files.
- Implemented an error-checking feature that displays a warning if a for-loop index is used in the `key` attribute.
- Implemented JavaScript & TypeScript editor features for embedded JavaScript / TypeScript content inside `.blits` files.
- Merged project `tsconfig.json` and `jsconfig.json` with extension defaults to maintain critical settings while allowing user customizations (regarding `.blits` file editor features).
- Resolved an issue where commenting multiple lines out in the template strings (in `.js`/`.ts` files) caused their indentation to increase with each save.

## v0.5.0

- added support for block comments
- added auto template formating on save feature and the corresponding settings ([#17](https://github.com/lightning-js/blits-vscode-extension/issues/17))
- fixed auto insertion of default values of props
- improved indentation while commenting out template code
- added syntax highlighting for reactive/interpolated attributes ([#15](https://github.com/lightning-js/blits-vscode-extension/issues/15))
- fixed syntax highlighting for `align` attribute ([#19](https://github.com/lightning-js/blits-vscode-extension/issues/15))

## v0.4.1

- fixed IntelliSense suggestions for TypeScript projects
- fixed the order of suggested items so they can appear on the top of the list

## v0.4.0

- enabled template syntax highlighting for also TypeScript
