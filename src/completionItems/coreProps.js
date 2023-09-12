const vscode = require('vscode')

// temporary solution
const coreNodeProps = [
  'x',
  'y',
  'width',
  'height',
  'alpha',
  'color',
  'colorTop',
  'colorBottom',
  'colorLeft',
  'colorRight',
  'colorTl',
  'colorTr',
  'colorBl',
  'colorBr',
  'parent',
  'zIndex',
  'texture',
  'textureOptions',
  'shader',
  'shaderProps',
  'zIndexLocked',
  'scale',
  'mount',
  'mountX',
  'mountY',
  'pivot',
  'pivotX',
  'pivotY',
  'rotation',
]

module.exports = async (attributes) => {
  let completionItems = []
  coreNodeProps.forEach((prop) => {
    if (!attributes.includes(prop)) {
      const completionItem = new vscode.CompletionItem(
        prop,
        vscode.CompletionItemKind.Property
      )
      completionItem.insertText = new vscode.SnippetString(`${prop}="$0"`)
      completionItems.push(completionItem)
    }
  })

  return completionItems
}
