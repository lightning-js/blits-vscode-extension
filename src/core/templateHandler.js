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

const documentHandler = require('./documentHandler')
const traverse = require('@babel/traverse').default
const vscode = require('vscode')

const isCursorInTemplate = (document, position) => {
  const currentDoc = document.getText()
  const isBlits = document.languageId === 'blits'

  if (isBlits) {
    return _isCursorInsideTemplateForBlits(document, currentDoc, position)
  }

  const ast = documentHandler.getASTForDocument(document)
  return _isCursorInsideComponentTemplate(document, ast, position)
}

const getTagAndAttributes = (document, position) => {
  const line = document.lineAt(position).text
  return _getExistingTagAndAttributes(line)
}

// Private methods
const _isCursorInsideTemplateForBlits = (document, text, position) => {
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

const _isCursorInsideComponentTemplate = (document, ast, position) => {
  if (!ast) return false

  const ranges = _findComponentTemplateRanges(ast)
  const cursorOffset = document.offsetAt(position)
  return ranges.some(({ start, end }) => cursorOffset >= start && cursorOffset <= end)
}

// const _findComponentTemplateRanges = (ast) => {
//   const ranges = []

//   traverse(ast, {
//     CallExpression(path) {
//       const callee = path.node.callee

//       // Check if it's a Blits.Component or Blits.Application call
//       if (
//         callee.type === 'MemberExpression' &&
//         callee.object.name === 'Blits' &&
//         (callee.property.name === 'Component' || callee.property.name === 'Application')
//       ) {
//         // For Component, config object is the second argument
//         // For Application, config object is the first argument
//         const configArgIndex = callee.property.name === 'Component' ? 1 : 0

//         if (path.node.arguments.length > configArgIndex) {
//           const configObject = path.node.arguments[configArgIndex]

//           if (configObject.type === 'ObjectExpression') {
//             configObject.properties.forEach((prop) => {
//               if (prop.key.name === 'template' && prop.value.type === 'TemplateLiteral') {
//                 ranges.push({
//                   start: prop.value.start,
//                   end: prop.value.end,
//                 })
//               }
//             })
//           }
//         }
//       }
//     },
//   })

//   return ranges
// }

const _findComponentTemplateRanges = (ast) => {
  const ranges = []

  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee

      // Check if callee is a MemberExpression.
      if (callee.type !== 'MemberExpression') return

      // Ensure the object is an Identifier named "Blits"
      if (callee.object.type !== 'Identifier' || callee.object.name !== 'Blits') return

      // Ensure the property is an Identifier and check its name.
      if (
        callee.property.type !== 'Identifier' ||
        (callee.property.name !== 'Component' && callee.property.name !== 'Application')
      ) {
        return
      }

      // For Component, the config object is the second argument;
      // for Application, it's the first argument.
      const configArgIndex = callee.property.name === 'Component' ? 1 : 0

      if (path.node.arguments.length <= configArgIndex) return

      const configObject = path.node.arguments[configArgIndex]
      if (configObject.type !== 'ObjectExpression') return

      configObject.properties.forEach((prop) => {
        // Narrow prop to ObjectProperty (ignore ObjectMethod or SpreadElement)
        if (prop.type !== 'ObjectProperty') return

        // Ensure the key is an Identifier
        if (prop.key.type !== 'Identifier') return

        // Check for the 'template' property and that its value is a TemplateLiteral.
        if (prop.key.name === 'template' && prop.value.type === 'TemplateLiteral') {
          ranges.push({
            start: prop.value.start,
            end: prop.value.end,
          })
        }
      })
    },
  })

  return ranges
}

const _getExistingTagAndAttributes = (line) => {
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
  const currentLine = position.line
  const currentChar = position.character
  const text = document.getText()
  const lines = text.split('\n')

  let tagInfo = {
    isInTag: false,
    tagName: null,
    attributes: [],
    tagStartLine: null,
    tagStartChar: null,
  }

  // First find the opening tag by looking backwards
  let openTagLine = currentLine
  let openTagChar = -1
  let foundOpenTag = false
  let bracketStack = []

  // Look backwards through lines
  for (let line = currentLine; line >= 0 && !foundOpenTag; line--) {
    const lineText = lines[line]
    // For current line, only look up to cursor
    const searchText = line === currentLine ? lineText.substring(0, currentChar) : lineText

    // Look for brackets from right to left
    for (let i = searchText.length - 1; i >= 0; i--) {
      const char = searchText[i]
      if (char === '>') {
        bracketStack.push('>')
      } else if (char === '<') {
        if (bracketStack.length === 0) {
          // Found our opening tag
          openTagLine = line
          openTagChar = i
          foundOpenTag = true
          break
        } else {
          bracketStack.pop()
        }
      }
    }
  }

  if (!foundOpenTag) {
    return tagInfo
  }

  // Get all text from tag start to current cursor position
  let tagText = ''
  for (let line = openTagLine; line <= currentLine; line++) {
    const lineText = lines[line]
    if (line === openTagLine) {
      if (line === currentLine) {
        // Same line start and end
        tagText += lineText.substring(openTagChar, currentChar)
      } else {
        // Start line but not end
        tagText += lineText.substring(openTagChar)
      }
    } else if (line === currentLine) {
      // End line but not start
      tagText += lineText.substring(0, currentChar)
    } else {
      // Middle line
      tagText += lineText
    }
    tagText += '\n'
  }

  // Check if we're in a comment
  if (tagText.trim().startsWith('<!--')) {
    return tagInfo
  }

  // Parse the tag content
  const result = parseTagContent(tagText)
  if (result) {
    return {
      ...result,
      tagStartLine: openTagLine,
      tagStartChar: openTagChar,
    }
  }

  return tagInfo
}

const parseTagContent = (text) => {
  if (!text || !text.startsWith('<')) {
    return null
  }

  const result = {
    isInTag: true,
    tagName: null,
    attributes: [],
  }

  // Extract tag name - handle whitespace after <
  const tagMatch = text.match(/^<\s*([^\s/>]+)/)
  if (tagMatch) {
    result.tagName = tagMatch[1]
  }

  // Convert text to single line to simplify attribute extraction
  const normalizedText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ')

  // Extract complete attributes only
  const attrRegex = /\s+([@\w\-:.]+)(?:=["'][^"']*["'])/g
  let match

  while ((match = attrRegex.exec(normalizedText)) !== null) {
    result.attributes.push(match[1])
  }

  // Check if we're actually inside the tag
  const closingBracketMatch = normalizedText.match(/>/)
  const selfClosingMatch = normalizedText.match(/\/>/)

  if (closingBracketMatch) {
    // self-closing tags
    const isSelfClosing = selfClosingMatch && selfClosingMatch.index === closingBracketMatch.index - 1

    // We're in the tag if we haven't reached closing sequence
    const closingSequence = isSelfClosing ? '/>' : '>'
    const closingIndex = normalizedText.indexOf(closingSequence)
    const lastTagNameIndex = normalizedText.lastIndexOf(result.tagName)

    result.isInTag = closingIndex === -1 || closingIndex > lastTagNameIndex
  }

  return result
}

const shouldSuggestTags = (document, position) => {
  // First check if we're inside a comment using the same logic
  const line = document.lineAt(position).text
  const lineUpToCursor = line.substring(0, position.character)
  if (lineUpToCursor.lastIndexOf('<!--') > lineUpToCursor.lastIndexOf('-->')) {
    return false
  }

  // Get all text up to cursor position, including the current line
  const textUpToCursor = document.getText(new vscode.Range(0, 0, position.line, position.character - 1))
  const lastClosingTag = Math.max(textUpToCursor.lastIndexOf('>'), textUpToCursor.lastIndexOf('/>'))
  const lastOpeningTag = textUpToCursor.lastIndexOf('<')

  // Valid if either:
  // 1. No tags before this point
  // 2. Last tag was properly closed
  return lastClosingTag > lastOpeningTag || lastOpeningTag === -1
}

module.exports = {
  isCursorInTemplate,
  getTagAndAttributes,
  getTagContext,
  shouldSuggestTags,
}
