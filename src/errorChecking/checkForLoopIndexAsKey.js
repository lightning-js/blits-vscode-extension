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
const path = require('path')
const documentHandler = require('../core/documentHandler')
const workspaceHandler = require('../core/workspaceHandler')

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.js', '.ts', '.blits']

function shouldProcessFile(document) {
  if (!workspaceHandler.isBlitsApp()) {
    return false
  }

  let fileName = document.fileName
  if (fileName.endsWith('.git')) {
    fileName = fileName.slice(0, -4)
  }

  const extension = path.extname(fileName)
  const isAllowedExtension = ALLOWED_EXTENSIONS.includes(extension)
  const isValidScheme = document.uri.scheme === 'file' || (document.uri.scheme === 'git' && extension === '.blits')
  const isInWorkspace =
    !fileName.includes('node_modules') && vscode.workspace.getWorkspaceFolder(document.uri) !== undefined
  return isAllowedExtension && isValidScheme && isInWorkspace
}

module.exports = (context, diagnosticsCollection) => {
  const checkForLoopIndexAsKey = (document) => {
    if (shouldProcessFile(document)) {
      // Clear previous diagnostics for this document
      diagnosticsCollection.clear()

      const diagnostics = analyzeForLoopKeyAttribute(document)
      diagnosticsCollection.set(document.uri, diagnostics)
      context.subscriptions.push(diagnosticsCollection)
    }
  }

  vscode.workspace.onDidChangeTextDocument((event) => checkForLoopIndexAsKey(event.document))
  vscode.workspace.onDidOpenTextDocument(checkForLoopIndexAsKey)
}

function analyzeForLoopKeyAttribute(document) {
  const diagnostics = []

  let templateSections = documentHandler.getAllTemplates(document)

  templateSections.forEach((section) => {
    const forLoops = findForLoops(section, document)

    forLoops.forEach((forLoop) => {
      if (!forLoop.keyAttribute) {
        // we should decide if we want to add this diagnostic
        // diagnostics.push(
        //   createDiagnostic(
        //     forLoop.range,
        //     'Missing key attribute in for loop. Consider adding a unique key for better performance.',
        //     vscode.DiagnosticSeverity.Information
        //   )
        // )
      } else if (keyUsesIndex(forLoop.keyAttribute, forLoop.forExpression.indexVariable)) {
        diagnostics.push(
          createDiagnostic(
            forLoop.keyAttributeRange || forLoop.range, // Use keyAttributeRange if available
            'Using for-loop index in key attribute is not recommended. Use a unique identifier from your data instead.',
            vscode.DiagnosticSeverity.Warning
          )
        )
      }
    })
  })

  return diagnostics
}

function keyUsesIndex(keyAttribute, indexVariable) {
  if (!indexVariable) return false
  const indexRegex = new RegExp('\\$' + indexVariable + '(?:\\b|\\s*[+\\-*/])', 'g')

  return indexRegex.test(keyAttribute)
}

function createDiagnostic(range, message, severity) {
  const diagnostic = new vscode.Diagnostic(range, message, severity)
  diagnostic.source = 'Blits'
  return diagnostic
}

function findForLoops(templateInfo, document) {
  const forLoops = []
  const forLoopRegex = /<(\w+)\s+[^>]*:for\s*=\s*["']([^"']+)["'][^>]*>/g
  const attributeRegex = /(\S+)\s*=\s*["']([^"']*)["']/g

  const templateText = templateInfo.content
  const baseOffset = templateInfo.start

  let match
  while ((match = forLoopRegex.exec(templateText)) !== null) {
    const [fullMatch, tagName, forExpression] = match
    const startIndex = baseOffset + match.index
    let endIndex = startIndex + fullMatch.length

    // Handle multi-line tags
    let fullTag = fullMatch
    if (!fullTag.includes('>')) {
      const remainingTemplate = templateText.slice(match.index + fullMatch.length)
      const closingTagIndex = remainingTemplate.indexOf('>')
      if (closingTagIndex !== -1) {
        fullTag += remainingTemplate.slice(0, closingTagIndex + 1)
        endIndex += closingTagIndex + 1
      }
    }

    let keyAttributeRange = null
    const attributes = {}

    // Find the key attribute specifically
    const keyRegex = /\bkey\s*=\s*["']([^"']*)["']/
    const keyMatch = fullTag.match(keyRegex)

    if (keyMatch) {
      const keyStartInTag = keyMatch.index
      const keyValueStart = keyStartInTag + keyMatch[0].indexOf(keyMatch[1])
      const keyValueEnd = keyValueStart + keyMatch[1].length

      const absoluteKeyValueStart = baseOffset + match.index + keyValueStart
      const absoluteKeyValueEnd = baseOffset + match.index + keyValueEnd

      keyAttributeRange = new vscode.Range(
        document.positionAt(absoluteKeyValueStart),
        document.positionAt(absoluteKeyValueEnd)
      )

      attributes['key'] = keyMatch[1]
    }

    // Parse other attributes
    let attrMatch
    while ((attrMatch = attributeRegex.exec(fullTag)) !== null) {
      const [, name, value] = attrMatch
      if (name !== 'key') {
        attributes[name] = value
      }
    }

    const forParts = forExpression.split(/\s+in\s+/)
    const itemVariable = forParts[0].replace(/[()]/g, '').split(',')[0].trim()
    const indexVariable = forParts[0].includes(',') ? forParts[0].replace(/[()]/g, '').split(',')[1].trim() : null
    const iterableExpression = forParts[1]

    forLoops.push({
      tagName,
      range: new vscode.Range(document.positionAt(startIndex), document.positionAt(endIndex)),
      attributes,
      forExpression: {
        itemVariable,
        indexVariable,
        iterableExpression,
      },
      keyAttribute: attributes.key || null,
      keyAttributeRange: keyAttributeRange,
    })
  }
  return forLoops
}
