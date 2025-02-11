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

const parseAST = require('../parsers/parseAST')
const traverse = require('@babel/traverse').default

const getASTForDocument = (document) => {
  const currentDoc = document.getText()
  const isBlits = document.languageId === 'blits'

  if (isBlits) {
    const { content, language } = getBlitsScript(currentDoc)
    return parseAST(content, language)
  }

  return parseAST(currentDoc, document.uri.fsPath.split('.').pop())
}

const getAllTemplates = (document) => {
  const currentDoc = document.getText()

  if (document.languageId === 'blits') {
    const template = getBlitsTemplate(currentDoc, true)
    if (template) {
      return [
        {
          start: template.start,
          end: template.end,
          content: template.content,
          type: 'template',
        },
      ]
    }
    return []
  }

  const ast = getASTForDocument(document)
  return getAllComponentTemplates(ast, currentDoc).map((t) => ({
    ...t,
    type: 'template-literal',
  }))
}

const isBlitsFile = (document) => {
  return document.languageId === 'blits'
}

const getBlitsTemplate = (fileContent, includeTemplateTags = false) => {
  const templateRegex = /(<template>)([\s\S]*?)(<\/template>)/
  const match = fileContent.match(templateRegex)

  if (match) {
    const fullMatch = match[0]
    const innerContent = match[2]

    if (includeTemplateTags) {
      return {
        content: fullMatch,
        start: match.index,
        end: match.index + fullMatch.length,
      }
    } else {
      const startOffset = match.index + match[1].length
      const endOffset = match.index + fullMatch.length - match[3].length

      return {
        content: innerContent,
        start: startOffset,
        end: endOffset,
      }
    }
  }

  return null
}

const getBlitsScript = (fileContent) => {
  const scriptRegex = /<script([^>]*)>([\s\S]*?)<\/script>/
  const scriptMatch = fileContent.match(scriptRegex)
  if (scriptMatch) {
    const scriptAttributes = scriptMatch[1].trim()
    const langMatch = scriptAttributes.match(/lang=['"]?(ts|js)['"]?/)
    const language = langMatch ? langMatch[1] : 'js'

    const scriptContentStart = scriptMatch.index + scriptMatch[0].indexOf('>') + 1
    const scriptContentEnd = scriptContentStart + scriptMatch[2].length

    return {
      content: scriptMatch[2],
      start: scriptContentStart,
      end: scriptContentEnd,
      language,
    }
  }

  return null
}

const getBlitsFileContent = (document) => {
  const fileContent = document.getText()

  let result = {
    template: null,
    script: null,
  }

  result.template = getBlitsTemplate(fileContent)
  result.script = getBlitsScript(fileContent)

  return result
}

const getAllComponentTemplates = (ast, sourceCode) => {
  const ranges = []
  const processedRanges = new Set()

  traverse(ast, {
    // Handle Blits.Component and Blits.Application calls
    CallExpression(path) {
      const callee = path.node.callee

      if (
        callee.type === 'MemberExpression' &&
        callee.object.type === 'Identifier' &&
        callee.object.name === 'Blits' &&
        callee.property.type === 'Identifier' &&
        (callee.property.name === 'Component' || callee.property.name === 'Application')
      ) {
        const configArgIndex = callee.property.name === 'Component' ? 1 : 0
        if (path.node.arguments.length <= configArgIndex) return

        const configObject = path.node.arguments[configArgIndex]
        if (configObject.type !== 'ObjectExpression') return

        configObject.properties.forEach((prop) => {
          if (prop.type === 'ObjectProperty' && prop.key.type === 'Identifier' && prop.key.name === 'template') {
            let unwrapped = null
            if (prop.value.type === 'TemplateLiteral') {
              unwrapped = prop.value.quasis[0].value.raw
            } else if (prop.value.type === 'StringLiteral') {
              unwrapped = prop.value.value
            }
            if (unwrapped !== null) {
              // Add range to Set to track processed ranges
              processedRanges.add(`${prop.value.start}-${prop.value.end}`)
              ranges.push({
                start: prop.value.start,
                end: prop.value.end,
                content: sourceCode ? sourceCode.substring(prop.value.start, prop.value.end) : null,
              })
            }
          }
        })
      }
    },

    // Handle any object with a template property
    ObjectExpression(path) {
      path.node.properties.forEach((prop) => {
        if (prop.type === 'ObjectProperty' && prop.key.type === 'Identifier' && prop.key.name === 'template') {
          let unwrapped = null
          if (prop.value.type === 'TemplateLiteral') {
            unwrapped = prop.value.quasis[0].value.raw
          } else if (prop.value.type === 'StringLiteral') {
            unwrapped = prop.value.value
          }
          // Only process if range hasn't been processed and template is valid
          const rangeKey = `${prop.value.start}-${prop.value.end}`
          if (unwrapped !== null && !processedRanges.has(rangeKey) && _isValidTemplateString(unwrapped)) {
            ranges.push({
              start: prop.value.start,
              end: prop.value.end,
              content: sourceCode ? sourceCode.substring(prop.value.start, prop.value.end) : null,
            })
          }
        }
      })
    },
  })

  return ranges
}

function _isValidTemplateString(str) {
  // Early returns for empty or non-string inputs
  if (!str || typeof str !== 'string') {
    return false
  }

  // Trim whitespace but preserve newlines
  str = str.replace(/^\s+|\s+$/gm, '')

  // Quick checks for obvious template indicators
  if (str.startsWith('<!--')) {
    return true
  }

  // Look for reactive bindings or event handlers
  if (str.includes(':') || str.includes('@')) {
    const hasAttribute = /[:@][a-zA-Z][^=]*=/.test(str)
    if (hasAttribute) {
      return true
    }
  }

  // Look for any tag-like structures, being permissive with whitespace
  const hasTagLikeStructure =
    /<[a-zA-Z][a-zA-Z0-9_-]*[\s\S]*?>/.test(str) || /<[a-zA-Z][a-zA-Z0-9_-]*[\s\S]*$/.test(str)

  if (!hasTagLikeStructure) {
    return false
  }

  // Check for template structure indicators (including incomplete)
  const templateIndicators = [
    // Complete tag with attributes across multiple lines
    /<[a-zA-Z][a-zA-Z0-9_-]*[\s\S]*?>/,
    // Self-closing tag across multiple lines
    /<[a-zA-Z][a-zA-Z0-9_-]*[\s\S]*?\/>/,
    // Closing tag (even incomplete)
    /<\/[a-zA-Z][a-zA-Z0-9_-]*/,
    // Incomplete opening tag with attributes
    /<[a-zA-Z][a-zA-Z0-9_-]*[\s\S]*$/,
    // Tag with reactive binding or event handler
    /<[a-zA-Z][a-zA-Z0-9_-]*[\s\S]*?[:@][a-zA-Z]/,
  ]

  // If we match any of these patterns, consider it a template
  for (const pattern of templateIndicators) {
    if (pattern.test(str)) {
      // Check for text before the first '<'
      const firstTagIndex = str.indexOf('<')
      if (firstTagIndex > 0) {
        const preText = str.slice(0, firstTagIndex).trim()
        if (preText && !preText.startsWith('<!--')) {
          return false
        }
      }
      return true
    }
  }

  return false
}

module.exports = {
  getASTForDocument,
  getAllTemplates,
  isBlitsFile,
  getBlitsTemplate,
  getBlitsScript,
  getBlitsFileContent,
  getAllComponentTemplates,
}
