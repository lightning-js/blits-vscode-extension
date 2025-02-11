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
const templateHandler = require('../core/templateHandler')
const workspaceHandler = require('../core/workspaceHandler')

module.exports = vscode.commands.registerCommand('blits-vscode.commentCommand', async () => {
  // check if the workspace is a Blits workspace
  if (!workspaceHandler.isBlitsApp()) {
    await vscode.commands.executeCommand('editor.action.commentLine')
    return
  }

  const editor = vscode.window.activeTextEditor

  if (editor) {
    const document = editor.document
    const selection = editor.selection
    const position = selection.active

    if (!templateHandler.isCursorInTemplate(document, position)) {
      await vscode.commands.executeCommand('editor.action.commentLine')
      return
    }

    await editor.edit((editBuilder) => {
      let startLine, endLine

      if (selection.isEmpty) {
        startLine = endLine = selection.start.line
      } else {
        startLine = selection.start.line
        endLine = selection.end.line
      }

      for (let i = startLine; i <= endLine; i++) {
        const line = document.lineAt(i)
        let lineText = line.text
        if (/^\s*$/.test(lineText)) {
          continue
        }
        let selectionRange = line.range
        const leadingWhitespaceMatch = line.text.match(/^\s*/)
        const leadingWhitespace = leadingWhitespaceMatch ? leadingWhitespaceMatch[0] : ''

        if (isLineCommented(lineText)) {
          lineText = lineText.replace(/^(\s*)<!--\s?/, '$1').replace(/\s?-->\s*$/, '')
        } else {
          lineText = `${leadingWhitespace}<!-- ${lineText.trim()} -->`
        }

        editBuilder.replace(selectionRange, lineText)
      }
    })
  }
})

const isLineCommented = (lineText) => {
  return /^\s*<!--(?:\s*<!--)*\s*.*\s*(?:-->\s*)*-->$/g.test(lineText)
}
