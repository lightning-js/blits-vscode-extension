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

function registerSignatureHelpProvider(context) {
  const signatureHelpProvider = vscode.languages.registerSignatureHelpProvider(
    'blits',
    {
      provideSignatureHelp(document, position) {
        const scriptInfo = extractScriptContent(document.getText())
        if (!scriptInfo) return

        const offset = document.offsetAt(position) - scriptInfo.startIndex
        if (offset < 0) return

        const virtualFileName = getVirtualFileName(document.uri, scriptInfo.lang)
        const { getLanguageService } = getLanguageServiceInstance()
        const languageService = getLanguageService(virtualFileName)

        if (!languageService) return

        const sigHelp = languageService.getSignatureHelpItems(virtualFileName, offset, {})

        if (!sigHelp) return

        const signatures = sigHelp.items.map((item) => {
          const label =
            item.prefixDisplayParts.map((part) => part.text).join('') +
            item.parameters.map((param) => param.displayParts.map((part) => part.text).join('')).join(', ') +
            item.suffixDisplayParts.map((part) => part.text).join('')

          const documentation = item.documentation?.map((part) => part.text).join('') || ''

          const signatureInfo = new vscode.SignatureInformation(label, new vscode.MarkdownString(documentation))

          signatureInfo.parameters = item.parameters.map((param) => {
            return new vscode.ParameterInformation(
              param.displayParts.map((part) => part.text).join(''),
              param.documentation
                ? new vscode.MarkdownString(param.documentation.map((part) => part.text).join(''))
                : undefined
            )
          })

          return signatureInfo
        })

        const signatureHelp = new vscode.SignatureHelp()
        signatureHelp.signatures = signatures
        signatureHelp.activeSignature = sigHelp.selectedItemIndex
        signatureHelp.activeParameter = sigHelp.argumentIndex

        return signatureHelp
      },
    },
    '(', // Trigger characters
    ',' // Trigger characters
  )
  context.subscriptions.push(signatureHelpProvider)
}

module.exports = { registerSignatureHelpProvider }
