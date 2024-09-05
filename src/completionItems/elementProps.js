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
  let code = ''
  try {
    const fileExists = await fs.pathExists(blitsElementJsPath)
    if (!fileExists) {
      console.error(
        `Blits - element.js not found at ${blitsElementJsPath}. Please make sure you have the @lightningjs/blits package installed.`
      )
      return false
    }
    code = await fs.readFile(blitsElementJsPath, 'utf8')
  } catch (error) {
    console.error(`Error resolving real path for ${blitsElementJsPath}:`, error)
    return false
  }

  // Parse the code to an AST
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['classProperties'], // Enable additional syntax features
  })

  // Traverse the AST to find the 'propsTransformer' object
  traverse(ast, {
    VariableDeclarator({ node }) {
      // Check if the variable declarator is for 'propsTransformer'
      if (
        node.id.name === 'propsTransformer' &&
        node.init.type === 'ObjectExpression'
      ) {
        // Traverse properties of the 'propsTransformer' object
        node.init.properties.forEach((property) => {
          if (
            property.type === 'ObjectMethod' &&
            property.kind === 'set' &&
            property.key.type === 'Identifier'
          ) {
            // Extract the name of the setter method
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

  return true
}

const suggest = async (attributes) => {
  // before suggesting items check if renderer props has been parsed
  // parsing occurs on activation but if it failed we also need to check here
  // just in case if blits package has been installed after activation
  if (!elementPropsParsed) {
    await parseProps()
  }

  let completionItems = []
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
