const vscode = require('vscode')
const templateHelper = require('../helpers/template')
const completionItems = require('../completionItems')
const parse = require('../parsers')

module.exports = vscode.languages.registerCompletionItemProvider(
  { language: 'javascript' },
  {
    // eslint-disable-next-line no-unused-vars
    async provideCompletionItems(document, position, token, context) {
      const currentDoc = document.getText()
      const currentDocAst = parse.AST(currentDoc)

      if (
        templateHelper.isCursorInsideTemplate(document, currentDocAst, position)
      ) {
        const currentLine = document.lineAt(position).text
        const { tagName, attributes } =
          templateHelper.getExistingTagAndAttributes(currentLine)

        console.log(`Current tag: ${tagName}`)

        // fixme: in some cases the content of a tag can be multiline
        if (tagName) {
          // hardcoded for now, Bolt will provide a map for rendererer props
          if (tagName === 'Element') {
            return await completionItems.coreProps(
              tagName,
              attributes,
              document,
              currentDocAst
            )
          } else {
            // get props for custom component
            return await completionItems.componentProps(
              tagName,
              attributes,
              document,
              currentDocAst
            )
          }
        }
      }
      return []
    },
  },
  ':'
)
