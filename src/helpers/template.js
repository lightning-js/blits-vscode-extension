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

const findTemplateRange = (ast) => {
  let start = 0
  let end = 0
  if (ast) {
    traverse(ast, {
      ObjectProperty(path) {
        if (path.node.key.name === 'template') {
          start = path.node.start
          end = path.node.end
        }
      },
    })

    return { start, end }
  }

  return { start: 0, end: 0 }
}

// const getTemplateText = (editorText) => {
//   const templateSectionRegex =
//     /template\s*:\s*(?:\/\*.*?\*\/)?\s*[`']([\s\S]*)[`']/g
//   const matches = templateSectionRegex.exec(editorText)

//   if (matches && matches[1]) {
//     return matches[1]
//   }
//   return ''
// }

const getTemplateText = (ast, sourceCode) => {
  let templateTexts = []

  if (ast) {
    traverse(ast, {
      // Check for CallExpression nodes to identify Blits.Component or Blits.Application calls
      CallExpression(path) {
        const callee = path.node.callee
        // Check if the callee is Blits.Component or Blits.Application
        if (
          callee.object &&
          callee.object.name === 'Blits' &&
          (callee.property.name === 'Component' ||
            callee.property.name === 'Application')
        ) {
          let argIndex = callee.property.name === 'Component' ? 1 : 0 // Determine the argument index based on the method

          // Ensure the target argument exists and is an object expression
          if (
            path.node.arguments.length > argIndex &&
            path.node.arguments[argIndex].type === 'ObjectExpression'
          ) {
            const arg = path.node.arguments[argIndex]
            arg.properties.forEach((property) => {
              if (
                property.key &&
                property.key.name === 'template' &&
                property.value.type === 'TemplateLiteral'
              ) {
                const templateNode = property.value
                // Extract the range of the template string
                const start = templateNode.start
                const end = templateNode.end

                // Extract the text from the source code
                const templateText = sourceCode.substring(start, end)
                templateTexts.push({
                  start,
                  end,
                  template: templateText,
                })
              }
            })
          }
        }
      },
    })
  }

  return templateTexts
}

const findComponentFileByName = (ast, tag) => {
  let file = null
  if (ast) {
    traverse(ast, {
      ImportDeclaration(path) {
        for (const specifier of path.node.specifiers) {
          if (
            specifier.type === 'ImportSpecifier' ||
            specifier.type === 'ImportDefaultSpecifier'
          ) {
            if (specifier.local.name === tag) {
              file = path.node.source.value
              break
            }
          }
        }
      },
    })
  }
  return file
}

const isCursorInsideTemplate = (document, ast, position) => {
  if (ast) {
    const { start, end } = findTemplateRange(ast)
    const cursorOffset = document.offsetAt(position)

    if (cursorOffset >= start && cursorOffset <= end) {
      return true
    }
  }
  return false
}

const isCursorInsideTag = (document, position) => {
  // Extract the text from the start of the document to the cursor position
  const start = new vscode.Position(0, 0)
  const range = new vscode.Range(start, position)
  const textUpToCursor = document.getText(range)
  const result = /<[^>]*([\s\S]*?)$/.test(textUpToCursor)
  console.log('isCursorInsideTag', result)
  // Multiline regex to check for an unclosed opening tag before the cursor
  return result
}

const getExistingTagAndAttributes = (line) => {
  let result = {
    tagName: null,
    attributes: [],
  }

  if (line.length > 0) {
    const regex = /<(\w+)\s+(.*?)[\s/>]*$/
    const match = regex.exec(line)

    if (match !== null) {
      result.tagName = match[1]
      const attributesString = match[2]

      const attributeRegex =
        /([\w.|data-]+)=["']?((?:.(?!["']?\s+(?:\S+)=|\s*\/?[>"']))+.)["']?/g
      let attributeMatch

      while (
        (attributeMatch = attributeRegex.exec(attributesString)) !== null
      ) {
        result.attributes.push(attributeMatch[1])
      }
    }
  }
  return result
}

const getTagContext = (document, position) => {
  const textBeforeCursor = document.getText(
    new vscode.Range(new vscode.Position(0, 0), position)
  )
  const textAfterCursor = document.getText(
    new vscode.Range(
      position,
      new vscode.Position(document.lineCount - 1, Number.MAX_VALUE)
    )
  )

  let tagContext = {
    insideTag: false,
    tagName: null,
    attributes: {},
    tagType: null, // "opening", "closing", or "self-closing"
  }

  // This regex is now designed to find the last "<tag" before the cursor and the first closing ">" after the cursor.
  // It captures opening, closing, and self-closing tags while considering multiline tags.
  const tagRegex =
    /<(\/*\w+)((?:\s+[\w:.]+(?:\s*=\s*"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|[^\s'">]*))?)*\s*(\/?)>/gs
  let lastOpeningTagBeforeCursorMatch = null
  let match

  // Find all tags before the cursor
  while ((match = tagRegex.exec(textBeforeCursor)) !== null) {
    lastOpeningTagBeforeCursorMatch = match // Keep updating until the last one before the cursor
  }

  // Check if the last matched tag before the cursor is actually an opening tag
  if (
    lastOpeningTagBeforeCursorMatch &&
    !lastOpeningTagBeforeCursorMatch[1].startsWith('/')
  ) {
    tagContext.insideTag = true
    tagContext.tagName = lastOpeningTagBeforeCursorMatch[1]
    tagContext.tagType =
      lastOpeningTagBeforeCursorMatch[3] === '/' ? 'self-closing' : 'opening'

    // Parse attributes
    const attributesString = lastOpeningTagBeforeCursorMatch[2]
    const attrRegex =
      /([\w:.]+)(?:\s*=\s*("(?:\\"|[^"])*"|'(?:\\'|[^'])*'|(\S+)))?/g
    let attrMatch
    while ((attrMatch = attrRegex.exec(attributesString)) !== null) {
      tagContext.attributes[attrMatch[1]] = attrMatch[2] || attrMatch[3] || true // Handle boolean attributes
    }
  }

  return tagContext
}

module.exports = {
  findTemplateRange,
  isCursorInsideTemplate,
  isCursorInsideTag,
  getTagContext,
  getExistingTagAndAttributes,
  findComponentFileByName,
  getTemplateText,
}
