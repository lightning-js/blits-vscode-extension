# Lightning Blits VS Code extension

This is the official VSCode extension for the Lightning Blits framework.

It provides syntax highlighting, code completion, error checking, and other features to make working with Blits easier.

## Features

### Syntax Highlighting

This extension enables syntax highlighting for the template in your Blits components.

### Code Completion

The extension offers context-aware IntelliSense for the Blits framework, focusing specifically on component properties and names within template definitions. For code outside of these templates, the extension defers to VSCode's built-in IntelliSense.

The code completion feature is designed to avoid suggesting duplicate component properties, providing a cleaner and more efficient coding experience.

### Commenting

The extension introduces an enhanced commenting feature for the XML-style templates within Blits components. Integrated seamlessly with the standard VSCode commenting shortcuts, this feature activates when the cursor is positioned within a Blits template or when a block of code within a template is selected. It enables rapid toggling of HTML-style comments (`<!--` and `-->`) without the need for manual insertion. 

### Format-on-Save

The extension includes an auto-format feature for the template definitions in Blits components. This feature enhances the development experience by automatically formatting the templates upon saving the file.

When you save a Blits component file (.js or .ts), the extension automatically formats the template sections within the file. This ensures that your templates are consistently styled and easy to read. The formatting applies only to the template parts of your file, leaving the rest of your JavaScript or TypeScript code unchanged.

You can disable this feature by setting the `blits.autoFormat` configuration option to `false`.

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
