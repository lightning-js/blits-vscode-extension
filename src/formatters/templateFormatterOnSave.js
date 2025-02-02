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
const prettier = require('prettier')
const documentHandler = require('../core/documentHandler')
const workspaceHandler = require('../core/workspaceHandler')

const diagnosticCollection = vscode.languages.createDiagnosticCollection('blits-template')

function clearDiagnostics(document) {
  diagnosticCollection.delete(document.uri)
}

function createTemplateDiagnostic(document, start, end, error) {
  const range = new vscode.Range(document.positionAt(start), document.positionAt(end))

  const matches = error.message.match(/(.*?)\n((?:.*\n)*)/)
  const errorDescription = matches
    ? matches[1].split('For more info')[0].replace(/\s*\(\d+:\d+\)\s*$/, '')
    : error.message
  const locationDisplay = matches ? matches[2] : ''
  const cleanMessage = errorDescription + '\n' + locationDisplay

  console.error(`Auto formatting error: ${cleanMessage}`)

  const diagnostic = new vscode.Diagnostic(
    range,
    'Template auto-formatting has failed due to template errors. Please fix the template and try again.',
    vscode.DiagnosticSeverity.Error
  )

  return diagnostic
}

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

  const trailingWhiteSpace = getTrailingWhiteSpace(template)
  template = modifyComments(template)
  let formattedTemplate = prettier.format(template, { parser, ...config })

  if (extraIndentation) {
    formattedTemplate = formattedTemplate.replace(/^/gm, extraIndentation)
  }

  formattedTemplate = formattedTemplate.trimEnd()
  formattedTemplate += trailingWhiteSpace

  return formattedTemplate
}

function modifyComments(str) {
  const regex = /(\s*)<!--[\s\S]*?-->/g

  return str.replace(regex, (match) => {
    const lines = match.split('\n')

    if (lines.length === 1) {
      return match
    }

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

function createEdit(document, start, end, newText) {
  const startPosition = document.positionAt(start)
  const endPosition = document.positionAt(end)
  return new vscode.TextEdit(new vscode.Range(startPosition, endPosition), newText)
}

function formatDocument(document) {
  const edits = []
  const templates = documentHandler.getAllTemplates(document)
  const diagnostics = []

  // Clear existing diagnostics
  clearDiagnostics(document)

  templates.forEach(({ start, end, content, type }) => {
    try {
      const stringChar = type === 'template-literal' ? content.slice(-1) : ''
      const templateText = type === 'template-literal' ? content.slice(1, -1) : content
      const indentation = type === 'template-literal' ? ' '.repeat(4) : ''

      const formattedTemplate = formatTemplate(templateText, 'angular', indentation)
      const newText =
        type === 'template-literal' ? `${stringChar}\n${formattedTemplate}${stringChar}` : formattedTemplate

      edits.push(createEdit(document, start, end, newText))
    } catch (err) {
      diagnostics.push(createTemplateDiagnostic(document, start, end, err))
    }
  })

  if (diagnostics.length > 0) {
    diagnosticCollection.set(document.uri, diagnostics)
  }

  if (documentHandler.isBlitsFile(document)) {
    const text = document.getText()
    const script = documentHandler.getBlitsScript(text)
    if (script) {
      try {
        const { start, end, content, language } = script
        const formattedScript =
          '\n\n' +
          prettier.format(content, {
            parser: language === 'ts' ? 'typescript' : 'babel',
            ...getAutoFormatConfig(),
          })
        edits.push(createEdit(document, start, end, formattedScript))
      } catch (err) {
        console.error('Error formatting script section:', err)
      }
    }
  }

  return edits
}

module.exports = vscode.workspace.onWillSaveTextDocument((event) => {
  if (!workspaceHandler.isBlitsApp()) return

  const autoFormatEnabled = vscode.workspace.getConfiguration('blits').get('autoFormat')
  if (!autoFormatEnabled) return

  const document = event.document
  const edits = formatDocument(document)

  if (edits.length > 0) {
    event.waitUntil(Promise.resolve(edits))
  }
})
