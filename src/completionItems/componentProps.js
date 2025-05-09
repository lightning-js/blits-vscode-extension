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
const componentHandler = require('../core/componentHandler')
const elementProps = require('./elementProps')

const createCompletionItems = (props, existingAttributes, tag) => {
  return props.flatMap((prop) => {
    if (existingAttributes.includes(prop.key)) return []

    const createItem = (prefix = '') => {
      const item = new vscode.CompletionItem(`${prefix}${prop.key}`, vscode.CompletionItemKind.Property)
      item.insertText = new vscode.SnippetString(`${prop.key}="${prop.default || ''}$0"`)
      item.sortText = `0${prefix}${prop.key}`
      let reactiveSuffix = ''
      if (prefix === ':') {
        reactiveSuffix = '(Reactive)'
      }
      item.detail = `${tag} | ${prop.key} ${reactiveSuffix}`

      const doc = new vscode.MarkdownString()
      doc.isTrusted = true // Enable trusted rendering

      // Use the detailed TypeScript type if available, otherwise fallback to standard cast
      let typeDisplay = prop.rawTypeName || prop.cast

      // Only lowercase standard types (String, Number, etc.) but preserve custom type names
      if (['String', 'Number', 'Boolean', 'Array', 'Object', 'Function'].includes(typeDisplay)) {
        typeDisplay = typeDisplay.toLowerCase()
      }

      // Properly display attribute, type, and default value
      doc.appendMarkdown(
        `\`\`\`ts\n${prop.key}: ${typeDisplay}${
          prop.default !== undefined && prop.default !== null ? ` = ${prop.default}` : ''
        }\n\`\`\``
      )

      // Component context
      doc.appendMarkdown(`\nDefined in component: \`${tag}\`.`)
      item.documentation = doc

      return item
    }

    return [createItem()]
  })
}

const suggest = async (tag, existingAttributes, document) => {
  let completionItems = []

  const elementCompletionItems = await elementProps.suggest('Element', existingAttributes)
  const componentData = await componentHandler.analyzeComponentsInDocument(document)
  const component = componentData.importedComponents.find((comp) => comp.name === tag)

  let componentCompletionItems = []
  if (component) {
    componentCompletionItems = createCompletionItems(component.props, existingAttributes, tag)
    completionItems.push(...componentCompletionItems)
  }

  const componentAttributesSet = new Set(componentCompletionItems.map((item) => item.label))

  // Filter out element props that conflict with component attributes
  const filteredElementCompletionItems = elementCompletionItems.filter(
    (item) => !componentAttributesSet.has(item.label)
  )

  // Merge component and filtered element suggestions
  completionItems.push(...filteredElementCompletionItems)

  return completionItems
}

module.exports = {
  suggest,
}
