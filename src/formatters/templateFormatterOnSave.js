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
const templateParser = require('../parsers/templateParser/parser')

const diagnosticCollection = vscode.languages.createDiagnosticCollection('blits-template')

function clearDiagnostics(document) {
  diagnosticCollection.delete(document.uri)
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
    const modifiedLines = lines.map((line, index) => (index === 0 ? line : '  ' + line))
    return modifiedLines.join('\n')
  })
}

function getTrailingWhiteSpace(text) {
  const trailingWhitespaceMatch = text.match(/(\s*)$/)
  if (!trailingWhitespaceMatch) {
    return ''
  }
  const trailingWhitespace = trailingWhitespaceMatch[0]
  return trailingWhitespace.includes('\n') ? '\n  ' : ''
}

function createEdit(document, start, end, newText) {
  const startPosition = document.positionAt(start)
  const endPosition = document.positionAt(end)
  return new vscode.TextEdit(new vscode.Range(startPosition, endPosition), newText)
}

async function formatDocument(document) {
  const edits = []
  const allDiagnostics = []
  const templates = documentHandler.getAllTemplates(document)
  clearDiagnostics(document)
  templates.forEach(({ start, end, content, type }) => {
    const stringChar = type === 'template-literal' ? content.slice(-1) : ''
    const templateText = type === 'template-literal' ? content.slice(1, -1) : content
    const indentation = type === 'template-literal' ? ' '.repeat(4) : ''
    // Validate template using the custom parser.
    const parseResult = templateParser(templateText)
    if (!parseResult.status) {
      const baseStart = start
      // Create diagnostics for each range in the error
      parseResult.error.ranges.forEach((range) => {
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(document.positionAt(baseStart + range.start), document.positionAt(baseStart + range.end)),
          parseResult.error.info,
          vscode.DiagnosticSeverity.Error
        )
        allDiagnostics.push(diagnostic)
      })
      return // Skip formatting this template.
    }
    // Format template if no parser errors occur.
    try {
      const formattedTemplate = formatTemplate(templateText, 'angular', indentation)
      const newText =
        type === 'template-literal'
          ? stringChar === '`'
            ? `${stringChar}\n${formattedTemplate}${stringChar}`
            : `${stringChar}${formattedTemplate.replace(/^\s*/, '')}${stringChar}`
          : formattedTemplate
      edits.push(createEdit(document, start, end, newText))
    } catch (err) {
      const baseStart = start
      // Create a single diagnostic for prettier formatting errors
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(document.positionAt(baseStart), document.positionAt(baseStart + (end - start))),
        err.message || 'Error formatting template',
        vscode.DiagnosticSeverity.Error
      )
      allDiagnostics.push(diagnostic)
    }
  })
  if (allDiagnostics.length > 0) {
    diagnosticCollection.set(document.uri, allDiagnostics)
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
  console.log('onWillSaveTextDocument 1', event.document.uri.path)
  // Check if the workspace is a Blits app
  if (!workspaceHandler.isBlitsApp()) return

  // Check if auto-formatting is enabled in the extension’s settings
  const autoFormatEnabled = vscode.workspace.getConfiguration('blits').get('autoFormat')
  if (!autoFormatEnabled) return

  // Get the document being saved
  const document = event.document

  // Restrict to specific language IDs
  const supportedLanguages = ['javascript', 'typescript', 'blits']
  if (!supportedLanguages.includes(document.languageId)) return

  // Format the document and pass the promise directly to waitUntil
  event.waitUntil(formatDocument(document))
})
