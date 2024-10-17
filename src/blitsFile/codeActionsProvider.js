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
const { getVirtualFileName } = require('./utils/fileNameGenerator')
const { getLanguageServiceInstance } = require('./languageService')
const { extractScriptContent } = require('./utils/scriptExtractor')

function registerCodeActionsProvider(context) {
  const codeActionProvider = vscode.languages.registerCodeActionsProvider(
    'blits',
    {
      provideCodeActions(document, range) {
        const scriptInfo = extractScriptContent(document.getText())
        if (!scriptInfo) return

        const startOffset = document.offsetAt(range.start) - scriptInfo.startIndex
        const endOffset = document.offsetAt(range.end) - scriptInfo.startIndex
        if (startOffset < 0 || endOffset < 0) return

        const virtualFileName = getVirtualFileName(document.uri, scriptInfo.lang)
        const languageService = getLanguageServiceInstance()
        const diagnostics = languageService
          .getSemanticDiagnostics(virtualFileName)
          .filter((d) => d.start >= startOffset && d.start + d.length <= endOffset)

        const actions = diagnostics
          .map((diagnostic) => {
            if (diagnostic.code === 7027) {
              // TS7027: Unreachable code detected
              const fix = new vscode.CodeAction('Remove unreachable code', vscode.CodeActionKind.QuickFix)
              const startPos = document.positionAt(scriptInfo.startIndex + diagnostic.start)
              const endPos = document.positionAt(scriptInfo.startIndex + diagnostic.start + diagnostic.length)
              fix.edit = new vscode.WorkspaceEdit()
              fix.edit.delete(document.uri, new vscode.Range(startPos, endPos))
              return fix
            }
            return null
          })
          .filter((action) => action !== null)

        return actions
      },
    },
    {
      providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
    }
  )
  context.subscriptions.push(codeActionProvider)
}

module.exports = { registerCodeActionsProvider }
