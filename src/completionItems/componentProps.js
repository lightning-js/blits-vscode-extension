const vscode = require('vscode')
const path = require('path')
const fs = require('fs-extra')
const parse = require('../parsers')
const templateHelper = require('../helpers/template')
const coreProps = require('./coreProps')

module.exports = async (tag, attributes, doc, docAst) => {
  let completionItems = []

  // Get the path of the current file
  const currentFilePath = doc.uri.fsPath
  const dir = path.dirname(currentFilePath)

  // get the import file for the tag
  const componentFile = templateHelper.findComponentFileByName(docAst, tag)
  console.log(`Component file: ${componentFile}`)

  if (componentFile && componentFile.length > 0) {
    try {
      // Component file
      const componentFilePath = path.join(dir, componentFile)
      const componentFileContent = await fs.readFile(componentFilePath, 'utf-8')

      console.log(`Component file path: ${componentFilePath}`)

      if (componentFileContent) {
        const ast = parse.AST(componentFileContent)
        const props = parse.componentProps(ast)

        console.log(`Props: ${JSON.stringify(props)}`)

        props.forEach((prop) => {
          if (!attributes.includes(prop.key)) {
            const completionItem = new vscode.CompletionItem(
              prop.key,
              vscode.CompletionItemKind.Property
            )
            completionItem.insertText = new vscode.SnippetString(
              `${prop.key}="$0"`
            )
            completionItems.push(completionItem)
          }

          // add also version of completion items that start with ':'
          // fixme: is there any way to understand if a property is reactive or not?
          if (!attributes.includes(prop.key)) {
            const reactiveCompletionItem = new vscode.CompletionItem(
              `:${prop.key}`,
              vscode.CompletionItemKind.Property
            )
            reactiveCompletionItem.insertText = new vscode.SnippetString(
              `${prop.key}="${prop.default ? prop.default : ''}$0"`
            )
            completionItems.push(reactiveCompletionItem)
          }
        })
      }
    } catch (err) {
      console.log(err)
      return []
    }
  }

  // always merge with core props
  const coreCompletionItems = await coreProps(attributes)
  completionItems = completionItems.concat(coreCompletionItems)

  return completionItems
}
