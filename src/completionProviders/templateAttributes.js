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
const completionItems = require('../completionItems')
const parse = require('../parsers')

const getCompletionItems = async (document, currentDoc, position, isBlits) => {
  let isCursorInsideTemplate = false
  if (isBlits) {
    isCursorInsideTemplate = templateHelper.isCursorInsideTemplateForBlits(document, currentDoc, position)
  } else {
    const ast = parse.AST(currentDoc, document.uri.fsPath.split('.').pop())
    isCursorInsideTemplate = templateHelper.isCursorInsideTemplate(document, ast, position)
  }

  if (isCursorInsideTemplate) {
    console.log('Cursor inside template')
    const currentLine = document.lineAt(position).text
    const { tagName, attributes } = templateHelper.getExistingTagAndAttributes(currentLine)

    if (tagName) {
      if (tagName === 'Element') {
        return await completionItems.elementProps.suggest(attributes)
      } else {
        let ast
        if (isBlits) {
          const { content, language } = templateHelper.getScriptContentForBlits(currentDoc)
          ast = parse.AST(content, language)
        } else {
          ast = parse.AST(currentDoc, document.uri.fsPath.split('.').pop())
        }

        return await completionItems.componentProps.suggest(tagName, attributes, document, ast)
      }
    }
  }

  return []
}

module.exports = vscode.languages.registerCompletionItemProvider(
  [{ language: 'javascript' }, { language: 'typescript' }, { language: 'blits' }],
  {
    async provideCompletionItems(document, position, token, context) {
      const currentDoc = document.getText()
      const isBlits = document.languageId === 'blits'
      return await getCompletionItems(document, currentDoc, position, isBlits)
    },
  },
  ':'
)
