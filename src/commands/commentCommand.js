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

module.exports = vscode.commands.registerCommand(
  'blits-vscode.commentCommand',
  async () => {
    const editor = vscode.window.activeTextEditor

    if (editor) {
      const document = editor.document
      const selection = editor.selection

      const currentDoc = document.getText()
      const currentDocAst = parse.AST(currentDoc)
      const cursorPosition = selection.active

      if (
        templateHelper.isCursorInsideTemplate(
          document,
          currentDocAst,
          cursorPosition
        )
      ) {
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

          const lineRanges = []

          for (let i = startLine; i <= endLine; i++) {
            const line = document.lineAt(i)
            let lineText = line.text
            let selectionRange = line.range

            // Check if the line is already an HTML comment
            if (isLineCommented(lineText)) {
              // Remove the comment
              lineText = lineText.replace(/<!-- (.*) -->/g, '$1')
            } else {
              // Add a comment
              if (isLineTemplateStart(lineText)) {
                lineText = document.getText(selection)
                selectionRange = selection
              }
              lineText = `<!-- ${lineText} -->`
            }

            // Replace the line in the editor
            editBuilder.replace(selectionRange, lineText)
            lineRanges.push(line.range)
          }
        })
      } else {
        // Otherwise, execute the built-in comment command
        await vscode.commands.executeCommand('editor.action.commentLine')
      }
    }
  }
)

const isLineCommented = (lineText) => {
  return lineText.match(/<!-- .* -->/)
}

const isLineTemplateStart = (lineText) => {
  return lineText.match(/^\s*template\s*:\s*(\/\*.*?\*\/)?\s*[`']/)
}
