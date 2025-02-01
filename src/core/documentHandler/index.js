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

const parseAST = require('../../parsers/parseAST')
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
  return _getTemplateText(ast, currentDoc).map((t) => ({
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

const _getTemplateText = (ast, sourceCode) => {
  let templateTexts = []

  if (ast) {
    traverse(ast, {
      CallExpression(path) {
        const callee = path.node.callee
        // Check that callee is a MemberExpression
        if (callee.type !== 'MemberExpression') return

        // Now that we know it's a MemberExpression, we can safely access .object and .property
        const member = callee
        if (member.object.type !== 'Identifier' || member.object.name !== 'Blits') return

        if (
          member.property.type !== 'Identifier' ||
          (member.property.name !== 'Component' && member.property.name !== 'Application')
        ) {
          return
        }

        // Determine the argument index based on the method name
        let argIndex = member.property.name === 'Component' ? 1 : 0

        if (path.node.arguments.length <= argIndex) return

        const argNode = path.node.arguments[argIndex]
        if (argNode.type !== 'ObjectExpression') return

        // Now we know argNode is an ObjectExpression
        argNode.properties.forEach((property) => {
          // Narrow property to ObjectProperty
          if (property.type !== 'ObjectProperty') return

          // Narrow key: ensure it's an Identifier
          if (property.key.type !== 'Identifier' || property.key.name !== 'template') return

          // Narrow value: ensure it's a TemplateLiteral
          if (property.value.type !== 'TemplateLiteral') return

          const templateNode = property.value
          const start = templateNode.start
          const end = templateNode.end
          // Ensure start and end are numbers before slicing
          if (typeof start !== 'number' || typeof end !== 'number') return

          const templateText = sourceCode.substring(start, end)
          templateTexts.push({
            start,
            end,
            content: templateText,
          })
        })
      },
    })
  }

  return templateTexts
}

module.exports = {
  getASTForDocument,
  getAllTemplates,
  isBlitsFile,
  getBlitsTemplate,
  getBlitsScript,
  getBlitsFileContent,
}
