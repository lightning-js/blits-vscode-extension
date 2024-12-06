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
// @ts-ignore
const vscode = require('vscode')
const traverse = require('@babel/traverse').default

const findTemplateRanges = (ast) => {
  const ranges = []

  if (ast) {
    traverse(ast, {
      ObjectProperty(path) {
        // Handle both Identifier and StringLiteral keys
        const keyName = getKeyName(path.node)

        if (keyName === 'template') {
          const valueNode = path.node.value

          // Handle different value types
          if (valueNode.type === 'TemplateLiteral') {
            // For template literals (backticks)
            ranges.push({ start: valueNode.start, end: valueNode.end })
          } else if (valueNode.type === 'StringLiteral') {
            // For string literals (' or ")
            ranges.push({ start: valueNode.start, end: valueNode.end })
          }
        }
      },
    })
  }

  return ranges
}

function getKeyName(node) {
  // Check if the key is an Identifier
  if (node.key.type === 'Identifier') {
    return node.key.name
  }

  // Check if the key is a StringLiteral
  if (node.key.type === 'StringLiteral') {
    return node.key.value
  }

  // If it's neither an Identifier nor a StringLiteral, return null
  return null
}

const findTemplateRange = (ast) => {
  let start = 0
  let end = 0
  if (ast) {
    traverse(ast, {
      ObjectProperty(path) {
        if (path.node.key.name === 'template') {
          start = path.node.value.start
          end = path.node.value.end
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
          (callee.property.name === 'Component' || callee.property.name === 'Application')
        ) {
          let argIndex = callee.property.name === 'Component' ? 1 : 0 // Determine the argument index based on the method

          // Ensure the target argument exists and is an object expression
          if (path.node.arguments.length > argIndex && path.node.arguments[argIndex].type === 'ObjectExpression') {
            const arg = path.node.arguments[argIndex]
            arg.properties.forEach((property) => {
              if (property.key && property.key.name === 'template' && property.value.type === 'TemplateLiteral') {
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

const getTemplates = (ast, sourceCode) => {
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
          (callee.property.name === 'Component' || callee.property.name === 'Application')
        ) {
          let argIndex = callee.property.name === 'Component' ? 1 : 0 // Determine the argument index based on the method

          // Ensure the target argument exists and is an object expression
          if (path.node.arguments.length > argIndex && path.node.arguments[argIndex].type === 'ObjectExpression') {
            const arg = path.node.arguments[argIndex]
            arg.properties.forEach((property) => {
              if (property.key && property.key.name === 'template' && property.value.type === 'TemplateLiteral') {
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

const getTemplateTextForBlits = (document, text, includeTemplateTags = false) => {
  const templateRegex = /(<template>)([\s\S]*?)(<\/template>)/

  const match = text.match(templateRegex)

  if (match) {
    const fullMatch = match[0]
    const templateContent = match[2]

    const startOffset = text.indexOf(fullMatch)
    const endOffset = startOffset + fullMatch.length

    if (includeTemplateTags) {
      return {
        start: startOffset,
        end: endOffset,
        template: fullMatch,
      }
    } else {
      return {
        start: startOffset + '<template>'.length,
        end: endOffset - '</template>'.length,
        template: templateContent,
      }
    }
  }

  return null
}

const getBlitsFileWithoutLicense = (text) => {
  // Regular expression to match a block comment at the start of the file
  const licenseRegex = /^\s*\/\*[\s\S]*?\*\/\s*/
  const match = text.match(licenseRegex)

  const licenseEnd = match ? match[0].length : 0
  const contentWithoutLicense = text.slice(licenseEnd).trim()

  const result = {}

  // Extract template part
  const templateRegex = /<template>([\s\S]*?)<\/template>/
  const templateMatch = contentWithoutLicense.match(templateRegex)
  if (templateMatch) {
    result.template = {
      content: templateMatch[0], // Including <template> and </template> tags
      start: licenseEnd + templateMatch.index,
      end: licenseEnd + templateMatch.index + templateMatch[0].length,
    }
  }

  // Extract script part
  const scriptRegex = /<script([^>]*)>([\s\S]*?)<\/script>/
  const scriptMatch = contentWithoutLicense.match(scriptRegex)
  if (scriptMatch) {
    const scriptAttributes = scriptMatch[1].trim()
    const langMatch = scriptAttributes.match(/lang=['"]?(ts|js)['"]?/)
    const lang = langMatch ? langMatch[1] : 'js' // Default to 'js' if no lang attribute or invalid value

    const scriptContentStart = licenseEnd + scriptMatch.index + scriptMatch[0].indexOf('>') + 1
    const scriptContentEnd = scriptContentStart + scriptMatch[2].length

    result.script = {
      content: scriptMatch[2],
      start: scriptContentStart,
      end: scriptContentEnd,
      lang: lang,
    }
  }

  return result
}

const getScriptContentForBlits = (text) => {
  // Regular expression to match the script tag and its content
  const scriptRegex = /<script(?:\s+lang\s*=\s*["']?(ts)["']?)?\s*>([\s\S]*?)<\/script>/i

  const match = text.match(scriptRegex)

  if (match) {
    const [, lang, content] = match

    return {
      content: content.trim(),
      language: lang === 'ts' ? 'ts' : 'js',
    }
  }

  return null // No script tag found
}

const findComponentFileByName = (ast, tag) => {
  let file = null
  if (ast) {
    traverse(ast, {
      ImportDeclaration(path) {
        for (const specifier of path.node.specifiers) {
          if (specifier.type === 'ImportSpecifier' || specifier.type === 'ImportDefaultSpecifier') {
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

// const isCursorInsideTemplate = (document, ast, position) => {
//   if (ast) {
//     const { start, end } = findTemplateRange(ast)
//     const cursorOffset = document.offsetAt(position)

//     if (cursorOffset >= start && cursorOffset <= end) {
//       return true
//     }
//   }
//   return false
// }
const isCursorInsideTemplate = (document, ast, position) => {
  if (ast) {
    const ranges = findTemplateRanges(ast)
    const cursorOffset = document.offsetAt(position)

    // Debugging Logs (Optional)
    // console.log('Template Ranges:', ranges)
    // console.log('Cursor Offset:', cursorOffset)

    return ranges.some(({ start, end }) => cursorOffset >= start && cursorOffset <= end)
  }
  return false
}

const isCursorInsideTemplateForBlits = (document, text, position) => {
  const cursorOffset = document.offsetAt(position)

  const templateStartMatch = text.match(/<template>/)
  const templateEndMatch = text.match(/<\/template>/)

  if (templateStartMatch && templateEndMatch) {
    const templateStart = templateStartMatch.index + '<template>'.length
    const templateEnd = templateEndMatch.index

    if (cursorOffset > templateStart && cursorOffset < templateEnd) {
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

      const attributeRegex = /([\w.|data-]+)=["']?((?:.(?!["']?\s+(?:\S+)=|\s*\/?[>"']))+.)["']?/g
      let attributeMatch

      while ((attributeMatch = attributeRegex.exec(attributesString)) !== null) {
        result.attributes.push(attributeMatch[1])
      }
    }
  }
  return result
}

const getTagContext = (document, position) => {
  const textBeforeCursor = document.getText(new vscode.Range(new vscode.Position(0, 0), position))
  // const textAfterCursor = document.getText(
  //   new vscode.Range(position, new vscode.Position(document.lineCount - 1, Number.MAX_VALUE))
  // )

  let tagContext = {
    insideTag: false,
    tagName: null,
    attributes: {},
    tagType: null, // "opening", "closing", or "self-closing"
  }

  // This regex is now designed to find the last "<tag" before the cursor and the first closing ">" after the cursor.
  // It captures opening, closing, and self-closing tags while considering multiline tags.
  const tagRegex = /<(\/*\w+)((?:\s+[\w:.]+(?:\s*=\s*"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|[^\s'">]*))?)*\s*(\/?)>/gs
  let lastOpeningTagBeforeCursorMatch = null
  let match

  // Find all tags before the cursor
  while ((match = tagRegex.exec(textBeforeCursor)) !== null) {
    lastOpeningTagBeforeCursorMatch = match // Keep updating until the last one before the cursor
  }

  // Check if the last matched tag before the cursor is actually an opening tag
  if (lastOpeningTagBeforeCursorMatch && !lastOpeningTagBeforeCursorMatch[1].startsWith('/')) {
    tagContext.insideTag = true
    tagContext.tagName = lastOpeningTagBeforeCursorMatch[1]
    tagContext.tagType = lastOpeningTagBeforeCursorMatch[3] === '/' ? 'self-closing' : 'opening'

    // Parse attributes
    const attributesString = lastOpeningTagBeforeCursorMatch[2]
    const attrRegex = /([\w:.]+)(?:\s*=\s*("(?:\\"|[^"])*"|'(?:\\'|[^'])*'|(\S+)))?/g
    let attrMatch
    while ((attrMatch = attrRegex.exec(attributesString)) !== null) {
      tagContext.attributes[attrMatch[1]] = attrMatch[2] || attrMatch[3] || true // Handle boolean attributes
    }
  }

  return tagContext
}

module.exports = {
  findTemplateRange,
  findTemplateRanges,
  isCursorInsideTemplate,
  isCursorInsideTemplateForBlits,
  isCursorInsideTag,
  getTagContext,
  getExistingTagAndAttributes,
  findComponentFileByName,
  getTemplateText,
  getTemplates,
  getScriptContentForBlits,
  getTemplateTextForBlits,
  getBlitsFileWithoutLicense,
}
