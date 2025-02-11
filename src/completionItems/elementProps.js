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
const { getAttributesForComponent, getCompletionDetails } = require('../core/framework/attributes')

const createCompletionItem = (tagName, name, isReactive = false) => {
  const nameWithPrefix = isReactive ? `:${name}` : name
  const item = new vscode.CompletionItem(nameWithPrefix, vscode.CompletionItemKind.Property)

  const details = getCompletionDetails(name)
  if (details) {
    const doc = new vscode.MarkdownString()
    doc.isTrusted = true // Enable trusted rendering

    doc.appendMarkdown('```ts\n')
    doc.appendMarkdown(`${name}: `)

    // Format types, handle enums and other complex types
    const typeStr = details.types
      .map((type) => {
        if (type === 'enum' && details.values) {
          // Display enum values as the type
          return details.values.map((value) => `'${value}'`).join(' | ')
        }
        if (typeof type === 'string') {
          return type // Simple type
        }
        if (type.type === 'object' && type.properties) {
          const props = Object.keys(type.properties)
            .map((key) => `  ${key}: ${type.properties[key].type}`) // Format object properties
            .join(',\n')
          return `{\n${props}\n}` // Return as an indented block
        }
        return type.type || 'object' // Fallback for unknown types
      })
      .join(' | ')

    doc.appendMarkdown(typeStr)

    if (details.defaultValue !== null && details.defaultValue !== undefined) {
      doc.appendMarkdown(` = ${JSON.stringify(details.defaultValue)}`)
    }

    doc.appendMarkdown('\n```\n')

    if (details.description) {
      doc.appendMarkdown(`\n${details.description}\n`)
    }

    item.documentation = doc

    // Add item details
    let reactiveSuffix = ''
    if (isReactive) {
      reactiveSuffix = '(Reactive)'
    }
    item.detail = `${tagName} | ${nameWithPrefix} ${reactiveSuffix}`

    // Add snippet for inserting
    let defaultValue = details.defaultValue !== null && details.defaultValue !== undefined ? details.defaultValue : ''
    if (name.startsWith('@')) {
      name = name.substring(1)
      defaultValue = '\\$methodName'
    }
    item.insertText = new vscode.SnippetString(`${name}="${defaultValue}$0"`)
  }

  item.sortText = `${isReactive ? '1' : '0'}-${name}`
  return item
}

const suggest = async (tagName, existingAttributes = [], onlyEventProps = false, onlyReactiveProps = false) => {
  const attributes = getAttributesForComponent(tagName, onlyEventProps, onlyReactiveProps)
  const items = []

  Object.keys(attributes).forEach((attrName) => {
    if (!existingAttributes.includes(attrName)) {
      if (onlyReactiveProps) {
        items.push(createCompletionItem(tagName, attrName, true))
      } else {
        items.push(createCompletionItem(tagName, attrName, false))
      }
    }
  })

  return items
}

module.exports = {
  suggest,
}
