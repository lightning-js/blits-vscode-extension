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
const parse = require('../parsers')
const templateHelper = require('../helpers/template')
const prettier = require('prettier')

const CONFIG_KEYS = [
  'printWidth',
  'tabWidth',
  'useTabs',
  'semi',
  'singleQuote',
  'quoteProps',
  'trailingComma',
  'bracketSpacing',
  'backetSameLine',
  'arrowParens',
  'singleAttributePerLine',
]

function getAutoFormatConfig() {
  const config = vscode.workspace.getConfiguration('blits.format')
  return CONFIG_KEYS.reduce((settings, key) => {
    if (Object.prototype.hasOwnProperty.call(config, key)) {
      settings[key] = config.get(key)
    }
    return settings
  }, {})
}

function formatTemplate(template, parser, extraIndentation = '') {
  const config = getAutoFormatConfig()

  if (extraIndentation.length > 0) {
    const regex = new RegExp('^' + extraIndentation, 'gm')
    template = template.replace(regex, '')
  }

  // preserve user-defined trailing whitespace
  const trailingWhiteSpace = getTrailingWhiteSpace(template)

  // process multiline comments
  template = modifyComments(template)
  let formattedTemplate = prettier.format(template, { parser, ...config })

  if (extraIndentation) {
    formattedTemplate = formattedTemplate.replace(/^/gm, extraIndentation)
  }

  // clean any auto generated trailing white space (respect user's choice here)
  formattedTemplate = formattedTemplate.trimEnd()
  formattedTemplate += trailingWhiteSpace

  return formattedTemplate
}

function formatScript(script, parser) {
  const config = getAutoFormatConfig()
  return '\n\n' + prettier.format(script, { parser, ...config })
}

function modifyComments(str) {
  const regex = /(\s*)<!--[\s\S]*?-->/g

  return str.replace(regex, (match) => {
    const lines = match.split('\n')

    // If it's a single-line comment, return it unchanged
    if (lines.length === 1) {
      return match
    }

    // Process multi-line comments
    const modifiedLines = lines.map((line, index) => {
      if (index === 0) {
        return line
      } else {
        return '  ' + line
      }
    })

    return modifiedLines.join('\n')
  })
}

function createEdit(document, start, end, newText) {
  const startPosition = document.positionAt(start)
  const endPosition = document.positionAt(end)
  return new vscode.TextEdit(new vscode.Range(startPosition, endPosition), newText)
}

function formatJS(document, currentDoc, fileExtension) {
  const currentDocAst = parse.AST(currentDoc, fileExtension)
  const templates = templateHelper.getTemplateText(currentDocAst, currentDoc)

  return templates.map(({ start, end, template }) => {
    const stringChar = template.slice(-1)
    const templateText = template.slice(1, -1)
    const formattedTemplate = formatTemplate(templateText, 'angular', ' '.repeat(4))
    const newText = `${stringChar}\n${formattedTemplate}${stringChar}`
    return createEdit(document, start, end, newText)
  })
}

const formatBlits = (document, currentDoc) => {
  const blitsFileObject = templateHelper.getBlitsFileWithoutLicense(currentDoc)

  const edits = []

  if (blitsFileObject.template) {
    const { start, end, content } = blitsFileObject.template
    try {
      const formattedTemplate = formatTemplate(content, 'angular')
      edits.push(createEdit(document, start, end, formattedTemplate))
    } catch (err) {
      console.log('Blits: error formatting template', err)
    }
  }

  if (blitsFileObject.script) {
    const { start, end, content, lang } = blitsFileObject.script
    try {
      const formattedScript = formatScript(content, lang === 'ts' ? 'typescript' : 'babel') //js uses babel parser
      edits.push(createEdit(document, start, end, formattedScript))
    } catch (err) {
      console.log('Blits: error formatting script', err)
    }
  }

  return edits
}

// keeps the user's trailing whitespace choice
function getTrailingWhiteSpace(text) {
  const trailingWhitespaceMatch = text.match(/(\s*)$/)

  if (!trailingWhitespaceMatch) {
    return ''
  }

  const trailingWhitespace = trailingWhitespaceMatch[0]
  const hasNewLine = trailingWhitespace.includes('\n')

  if (!hasNewLine) {
    return ''
  } else {
    return '\n  '
  }
}

module.exports = vscode.workspace.onWillSaveTextDocument((event) => {
  const autoFormatEnabled = vscode.workspace.getConfiguration('blits').get('autoFormat')

  if (!autoFormatEnabled) return

  const document = event.document
  const currentDoc = document.getText()
  const fileExtension = document.uri.fsPath.split('.').pop()

  const formatFunction = fileExtension === 'blits' ? formatBlits : formatJS
  const edits = formatFunction(document, currentDoc, fileExtension)

  if (edits.length > 0) {
    event.waitUntil(Promise.resolve(edits))
  }
})
