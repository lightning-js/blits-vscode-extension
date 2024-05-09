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
const traverse = require('@babel/traverse').default
const fs = require('fs-extra')
const parser = require('@babel/parser')
const path = require('path')

const elementProps = []
let elementPropsParsed = false

const parseProps = async () => {
  // get element/renderer props from Blits codebase
  const projectRootPath = vscode.workspace.workspaceFolders[0].uri.fsPath
  const blitsElementJsPath = path.join(
    projectRootPath,
    'node_modules/@lightningjs/blits/src/engines/L3/element.js'
  )
  const fileExists = await fs.pathExists(blitsElementJsPath)
  if (!fileExists) {
    console.error(
      `Blits - element.js not found at ${blitsElementJsPath}. Please make sure you have the @lightningjs/blits package installed.`
    )
    return
  }
  const code = await fs.readFile(blitsElementJsPath, 'utf8')

  // Parse the code to an AST
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['classProperties'], // Enable additional syntax features
  })

  // Traverse the AST to find the 'Props' object
  traverse(ast, {
    VariableDeclarator({ node }) {
      // Check if the variable declarator is for 'Props'
      if (node.id.name === 'Props' && node.init.type === 'ObjectExpression') {
        // Traverse properties of the 'Props' object
        node.init.properties.forEach((property) => {
          if (property.type === 'ObjectMethod' && property.kind === 'set') {
            // Extract the name of the property from setter methods
            elementProps.push(property.key.name)
          }
        })
      }
    },
  })

  if (elementProps.length > 0) {
    elementPropsParsed = true
  }

  console.log(`Got following prop names from Blits : ${elementProps}`)
}

const suggest = async (attributes) => {
  let completionItems = []
  console.log('element props', elementProps)
  elementProps.forEach((prop) => {
    if (!attributes.includes(prop)) {
      const completionItem = new vscode.CompletionItem(
        prop,
        vscode.CompletionItemKind.Property
      )
      completionItem.insertText = new vscode.SnippetString(`${prop}="$0"`)
      completionItems.push(completionItem)
    }
  })

  return completionItems
}

const isReady = () => {
  return elementPropsParsed
}

module.exports = {
  suggest,
  parseProps,
  isReady,
}
