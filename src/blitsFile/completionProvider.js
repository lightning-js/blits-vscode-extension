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

function capitalizeFirstLetter(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function registerCompletionProvider(context) {
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    'blits',
    {
      provideCompletionItems(document, position) {
        const scriptInfo = extractScriptContent(document.getText())
        if (!scriptInfo) return

        const offset = document.offsetAt(position) - scriptInfo.startIndex
        if (offset < 0) return

        const virtualFileName = getVirtualFileName(document.uri, scriptInfo.lang)
        const { getLanguageService } = getLanguageServiceInstance()
        const languageService = getLanguageService(virtualFileName)

        if (!languageService) return

        const completions = languageService.getCompletionsAtPosition(virtualFileName, offset, {
          includeCompletionsWithInsertText: true,
        })

        if (!completions) return

        return completions.entries.map((entry) => {
          // Normalize the kind name to match VSCode's CompletionItemKind keys
          const kindName = capitalizeFirstLetter(entry.kind.toLowerCase())
          const mappedKind = vscode.CompletionItemKind[kindName]

          /**
           * @type {vscode.CompletionItemKind}
           */
          const kind = typeof mappedKind === 'number' ? mappedKind : vscode.CompletionItemKind.Variable

          const item = new vscode.CompletionItem(entry.name, kind)
          item.detail = entry.kind
          if (entry.kindModifiers) {
            item.detail += ` (${entry.kindModifiers})`
          }
          return item
        })
      },
    },
    '.', // Trigger characters
    '(',
    '@' // Trigger characters
  )
  context.subscriptions.push(completionProvider)
}

module.exports = { registerCompletionProvider }
