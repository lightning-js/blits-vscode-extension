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
const ts = require('typescript')
const { extractScriptContent } = require('./utils/scriptExtractor')
const { getVirtualFileName } = require('./utils/fileNameGenerator')
const { getLanguageServiceInstance } = require('./languageService')
const { addVirtualFile, deleteVirtualFilesByUri } = require('./virtualDocuments')

const diagnosticCollection = vscode.languages.createDiagnosticCollection('blits')

function registerDiagnostics(context) {
  context.subscriptions.push(diagnosticCollection)

  const updateDiagnostics = (document) => {
    const scriptInfo = extractScriptContent(document.getText())
    if (!scriptInfo) {
      diagnosticCollection.set(document.uri, [])
      return
    }

    const virtualFileName = getVirtualFileName(document.uri, scriptInfo.lang)
    addVirtualFile(virtualFileName, scriptInfo.content, document.version)

    const { getLanguageService } = getLanguageServiceInstance()
    const languageService = getLanguageService(virtualFileName)

    if (!languageService) {
      diagnosticCollection.set(document.uri, [])
      return
    }

    const syntacticDiagnostics = languageService.getSyntacticDiagnostics(virtualFileName)
    const semanticDiagnostics = languageService.getSemanticDiagnostics(virtualFileName)
    const allDiagnostics = syntacticDiagnostics.concat(semanticDiagnostics)

    const diagnostics = allDiagnostics
      .map((diagnostic) => {
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
        if (diagnostic.file) {
          const start = scriptInfo.startIndex + diagnostic.start
          const end =
            diagnostic.start !== undefined && diagnostic.length !== undefined ? start + diagnostic.length : start + 1 // Fallback if length is undefined

          const startPos = document.positionAt(start)
          const endPos = document.positionAt(end)

          return new vscode.Diagnostic(
            new vscode.Range(startPos, endPos),
            message,
            diagnostic.category === ts.DiagnosticCategory.Error
              ? vscode.DiagnosticSeverity.Error
              : vscode.DiagnosticSeverity.Warning
          )
        }
        return null
      })
      .filter((d) => d !== null)

    diagnosticCollection.set(document.uri, diagnostics)
  }

  // Event listeners
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.languageId === 'blits') {
        updateDiagnostics(event.document)
      }
    }),
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (document.languageId === 'blits') {
        updateDiagnostics(document)
      }
    }),
    vscode.workspace.onDidCloseTextDocument((document) => {
      if (document.languageId === 'blits') {
        deleteVirtualFilesByUri(document.uri)
        diagnosticCollection.delete(document.uri)
      }
    })
  )

  // Initialize diagnostics for active editor
  if (vscode.window.activeTextEditor) {
    const document = vscode.window.activeTextEditor.document
    if (document.languageId === 'blits') {
      updateDiagnostics(document)
    }
  }
}

module.exports = { registerDiagnostics }
