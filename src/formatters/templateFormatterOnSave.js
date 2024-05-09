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
const parse = require('../parsers')
const templateHelper = require('../helpers/template')
const prettier = require('prettier')
const configKeys = [
  'printWidth',
  'tabWidth',
  'useTabs',
  'semi',
  'singleQuote',
  'quoteProps',
  'trailingComma',
  'bracketSpacing',
  'backetSameLine',
  'arrowParens',
  'singleAttributePerLine',
]

module.exports = vscode.workspace.onWillSaveTextDocument((event) => {
  // check if auto format is enabled
  const autoFormatEnabled = vscode.workspace
    .getConfiguration('blits')
    .get('autoFormat')

  if (!autoFormatEnabled) {
    return
  }

  const document = event.document
  const currentDoc = document.getText()
  const fileExtension = document.uri.fsPath.split('.').pop()
  const currentDocAst = parse.AST(currentDoc, fileExtension)
  const templates = templateHelper.getTemplateText(currentDocAst, currentDoc)

  let edits = []

  if (templates.length > 0) {
    templates.forEach((templateObject) => {
      const { start, end, template } = templateObject
      const stringChar = template.slice(-1)

      // remove first and last character (`, ', ", ``, '', "")
      const templateText = template.slice(1, -1)
      const config = getAutoFormatConfig()
      let formattedTemplate = prettier.format(templateText, {
        parser: 'angular',
        ...config,
      })

      // add extra indentation for all lines (4 spaces)
      const extraIndentation = ' '.repeat(4)
      formattedTemplate =
        extraIndentation +
        formattedTemplate
          .replace(/\n/g, `\n${extraIndentation}`)
          .replace(/[\t ]+$/, '  ') // indent 2 spaces if the last line only contains a newline/space/tab

      // add template key and possible comment back
      formattedTemplate = `${stringChar}\n${formattedTemplate}${stringChar}`

      const startPosition = document.positionAt(start)
      const endPosition = document.positionAt(end)

      const edit = new vscode.TextEdit(
        new vscode.Range(startPosition, endPosition),
        formattedTemplate
      )
      edits.push(edit)
    })
  }

  if (edits.length > 0) {
    event.waitUntil(Promise.resolve(edits))
  }
})

function getAutoFormatConfig() {
  const config = vscode.workspace.getConfiguration('blits.format')
  let allSettings = {}
  configKeys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(config, key)) {
      allSettings[key] = config.get(key)
    }
  })
  return allSettings
}
