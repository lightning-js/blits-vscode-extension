/*
 * Copyright 2023 Comcast Cable Communications Management, LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const vscode = require('vscode')
const templateHelper = require('../helpers/template')
const parse = require('../parsers')

module.exports = vscode.commands.registerCommand('blits-vscode.commentCommand', async () => {
  const editor = vscode.window.activeTextEditor

  if (editor) {
    const document = editor.document
    const selection = editor.selection
    const isBlits = document.languageId === 'blits'

    const currentDoc = document.getText()
    const cursorPosition = selection.active

    let isCursorInsideTemplate = false
    if (isBlits) {
      isCursorInsideTemplate = templateHelper.isCursorInsideTemplateForBlits(document, currentDoc, cursorPosition)
    } else {
      const currentDocAst = parse.AST(
        currentDoc,
        document.languageId === 'typescript' || document.languageId === 'tsx' ? 'ts' : 'js'
      )
      isCursorInsideTemplate = templateHelper.isCursorInsideTemplate(document, currentDocAst, cursorPosition)
    }

    if (isCursorInsideTemplate) {
      await editor.edit((editBuilder) => {
        let startLine, endLine

        if (selection.isEmpty) {
          // If no text is selected, get the entire line where the cursor is
          startLine = endLine = selection.start.line
        } else {
          // Get the entire lines that the selection spans
          startLine = selection.start.line
          endLine = selection.end.line
        }

        for (let i = startLine; i <= endLine; i++) {
          const line = document.lineAt(i)
          let lineText = line.text
          // Skip the line if it's empty or contains only whitespace
          if (/^\s*$/.test(lineText)) {
            continue
          }
          let selectionRange = line.range
          const leadingWhitespaceMatch = line.text.match(/^\s*/)
          const leadingWhitespace = leadingWhitespaceMatch ? leadingWhitespaceMatch[0] : ''

          if (isLineCommented(lineText)) {
            // Uncomment the line by removing <!-- and -->
            lineText = lineText.replace(/^(\s*)<!--\s?/, '$1').replace(/\s?-->\s*$/, '')
          } else {
            // Comment the line by adding <!-- and -->
            lineText = `${leadingWhitespace}<!-- ${lineText.trim()} -->`
          }

          // Replace the line in the editor
          editBuilder.replace(selectionRange, lineText)
        }
      })
    } else {
      // Otherwise, execute the built-in comment command
      await vscode.commands.executeCommand('editor.action.commentLine')
    }
  }
})

const isLineCommented = (lineText) => {
  // Matches lines that start with <!-- and end with -->
  return /^\s*<!--(?:\s*<!--)*\s*.*\s*(?:-->\s*)*-->$/g.test(lineText)
}

// const isLineTemplateStart = (lineText) => {
//   return /^\s*template\s*:\s*(\/\*.*?\*\/)?\s*[`'"]/g.test(lineText)
// }
