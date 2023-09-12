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

// temporary solution
const coreNodeProps = [
  'x',
  'y',
  'width',
  'height',
  'alpha',
  'color',
  'colorTop',
  'colorBottom',
  'colorLeft',
  'colorRight',
  'colorTl',
  'colorTr',
  'colorBl',
  'colorBr',
  'parent',
  'zIndex',
  'texture',
  'textureOptions',
  'shader',
  'shaderProps',
  'zIndexLocked',
  'scale',
  'mount',
  'mountX',
  'mountY',
  'pivot',
  'pivotX',
  'pivotY',
  'rotation',
]

module.exports = async (attributes) => {
  let completionItems = []
  coreNodeProps.forEach((prop) => {
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
