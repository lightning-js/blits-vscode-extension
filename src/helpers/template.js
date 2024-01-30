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
      ObjectProperty(path) {
        if (path.node.key.name === 'template') {
          const templateNode = path.node.value
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

module.exports = {
  findTemplateRange,
  isCursorInsideTemplate,
  getExistingTagAndAttributes,
  findComponentFileByName,
  getTemplateText,
}
