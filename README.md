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