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

The extension provides several configuration options to customize the auto-formatting feature. These settings allow you to tailor the formatting to your coding style and preferences.

#### Available Settings

###### Indent Size (`blits.format.indent_size`): 2
Sets the number of spaces used for indentation. Valid range is 0 to 8.

###### Indent Character (`blits.format.indent_char`): " " _(space)_
Character used for indentation. Typically a space or a tab character.

###### Indent with Tabs (`blits.format.indent_with_tabs`): `false`
When `true`, indents with tabs instead of spaces. Overrides indent size and character.

###### End of Line Character (`blits.format.eol`): "\n"
Character(s) used for line terminators.

###### End with Newline (`blits.format.end_with_newline`): `false`
When `true`, ensures that the output ends with a newline.

###### Preserve Newlines (`blits.format.preserve_newlines`): `true`
When `true`, maintains existing line breaks in the code.

###### Maximum Preserve Newlines (`blits.format.max_preserve_newlines`): `1`
Maximum number of line-breaks to be preserved in one chunk.

###### Wrap Line Length (`blits.format.wrap_line_length`): `120`
Wraps lines that exceed this number of characters. Set to 0 for no wrap.

###### Indent Empty Lines (`blits.format.indent_empty_lines`): `false`
When `true`, maintains indentation on empty lines.

#### Customizing Settings

To customize these settings, follow these steps:

- Open your VSCode settings (either user or workspace settings).
- Search for `Blits` to find all the relevant settings for the Blits extension.
- Modify the settings as needed. Changes will be applied immediately.
