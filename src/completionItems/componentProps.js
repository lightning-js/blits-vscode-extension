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

const createCompletionItems = (props, attributes) => {
  return props.flatMap((prop) => {
    if (attributes.includes(prop.key)) return []

    const createItem = (prefix = '') => {
      const item = new vscode.CompletionItem(`${prefix}${prop.key}`, vscode.CompletionItemKind.Property)
      item.insertText = new vscode.SnippetString(`${prop.key}="${prop.default || ''}$0"`)
      item.sortText = `0${prefix}${prop.key}`
      return item
    }

    return [createItem(), createItem(':')]
  })
}

const parseComponent = (attributes, componentFileContent, fileExtension) => {
  let ast, props

  if (fileExtension === 'blits') {
    const { content, language } = templateHelper.getScriptContentForBlits(componentFileContent)
    ast = parse.AST(content, language)
  } else {
    ast = parse.AST(componentFileContent)
  }

  props = parse.componentProps(ast)
  const completionItems = createCompletionItems(props, attributes)

  return completionItems
}

const suggest = async (tag, attributes, doc, docAst) => {
  let completionItems = []

  const currentFilePath = doc.uri.fsPath
  const dir = path.dirname(currentFilePath)

  const componentFile = templateHelper.findComponentFileByName(docAst, tag)

  if (componentFile && componentFile.length > 0) {
    try {
      const componentFilePath = path.join(dir, componentFile)
      const fileExtension = componentFile.split('.').pop()
      const componentFileContent = await fs.readFile(componentFilePath, 'utf-8')

      if (componentFileContent) {
        completionItems = parseComponent(attributes, componentFileContent, fileExtension)
      }
    } catch (err) {
      console.error('Error parsing component:', err)
      return []
    }
  }

  // always merge with core props
  const elementCompletionItems = await elementProps.suggest(attributes)
  completionItems = completionItems.concat(elementCompletionItems)

  return completionItems
}

module.exports = {
  suggest,
}
