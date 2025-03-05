// src/templates/BlitsFileTemplateProvider.ts
const vscode = require('vscode')

// Create a file watcher to detect new .blits files
module.exports = (context) => {
  // Register the command for manual template insertion
  context.subscriptions.push(
    vscode.commands.registerCommand('blits.insertComponentTemplate', async () => {
      const editor = vscode.window.activeTextEditor
      if (editor && editor.document.fileName.endsWith('.blits')) {
        const componentName = getComponentName(editor.document.fileName)
        await insertTemplate(editor, componentName)
      }
    })
  )

  // Watch for new file creation
  const fileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/*.blits')
  context.subscriptions.push(fileSystemWatcher)

  fileSystemWatcher.onDidCreate(async (uri) => {
    const document = await vscode.workspace.openTextDocument(uri)
    const editor = await vscode.window.showTextDocument(document)

    // Only insert template if the file is empty
    if (document.getText().trim() === '') {
      const componentName = getComponentName(uri.fsPath)
      await insertTemplate(editor, componentName)
    }
  })
}

// Helper function to insert the template
const insertTemplate = async (editor, componentName) => {
  await editor.edit((editBuilder) => {
    const fullText = `<template>
  <!-- component template here -->
</template>

<script>

import Blits from '@lightningjs/blits'

export default Blits.Component('${componentName}', {
  state() {
    return {
      // state variables
    }
  },
  hooks: {
    ready() {

      // Component is ready for interaction
    }
  },
})
</script>
`
    // Insert at the beginning of the file
    const start = new vscode.Position(0, 0)
    const end = editor.document.lineAt(editor.document.lineCount - 1).range.end
    editBuilder.replace(new vscode.Range(start, end), fullText)
  })

  // Format the document
  await vscode.commands.executeCommand('editor.action.formatDocument')
}

// Helper function to generate component name from file path
const getComponentName = (filePath) => {
  const fileName = filePath.split(/[/\\]/).pop() || ''
  return fileName
    .replace('.blits', '')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}
