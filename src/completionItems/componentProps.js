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
const path = require('path')
const fs = require('fs-extra')
const parse = require('../parsers')
const templateHelper = require('../helpers/template')
const elementProps = require('./elementProps')

module.exports = async (tag, attributes, doc, docAst) => {
  let completionItems = []

  // Get the path of the current file
  const currentFilePath = doc.uri.fsPath
  const dir = path.dirname(currentFilePath)

  // get the import file for the tag
  const componentFile = templateHelper.findComponentFileByName(docAst, tag)
  console.log(`Component file: ${componentFile}`)

  if (componentFile && componentFile.length > 0) {
    try {
      // Component file
      const componentFilePath = path.join(dir, componentFile)
      const componentFileContent = await fs.readFile(componentFilePath, 'utf-8')

      console.log(`Component file path: ${componentFilePath}`)

      if (componentFileContent) {
        const ast = parse.AST(componentFileContent)
        const props = parse.componentProps(ast)

        console.log(`Props: ${JSON.stringify(props)}`)

        props.forEach((prop) => {
          if (!attributes.includes(prop.key)) {
            const completionItem = new vscode.CompletionItem(
              prop.key,
              vscode.CompletionItemKind.Property
            )
            completionItem.insertText = new vscode.SnippetString(
              `${prop.key}="$0"`
            )
            completionItems.push(completionItem)
          }

          // add also version of completion items that start with ':'
          // fixme: is there any way to understand if a property is reactive or not?
          if (!attributes.includes(prop.key)) {
            const reactiveCompletionItem = new vscode.CompletionItem(
              `:${prop.key}`,
              vscode.CompletionItemKind.Property
            )
            reactiveCompletionItem.insertText = new vscode.SnippetString(
              `${prop.key}="${prop.default ? prop.default : ''}$0"`
            )
            completionItems.push(reactiveCompletionItem)
          }
        })
      }
    } catch (err) {
      console.log(err)
      return []
    }
  }

  // always merge with core props
  const elementCompletionItems = await elementProps(attributes)
  completionItems = completionItems.concat(elementCompletionItems)

  return completionItems
}
