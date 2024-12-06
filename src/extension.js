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

// const fileManager = require('./fileManager')
const completionProviders = require('./completionProviders')
const commands = require('./commands')
const formatters = require('./formatters')
const completionItems = require('./completionItems')
const errorChecking = require('./errorChecking')
const vscode = require('vscode')
const { registerDiagnostics } = require('./blitsFile/diagnostics')
const { registerHoverProvider } = require('./blitsFile/hoverProvider')
const { registerCompletionProvider } = require('./blitsFile/completionProvider')
const { registerSignatureHelpProvider } = require('./blitsFile/signatureHelpProvider')
// const { registerCodeActionsProvider } = require('./blitsFile/codeActionsProvider') // not working yet
const { getLanguageServiceInstance } = require('./blitsFile/languageService')
const packageJSON = require('../package.json')

async function activate(context) {
  console.log('Lightning Blits is being activated.')

  try {
    // Blits file type features
    const languageService = getLanguageServiceInstance()
    if (!languageService) {
      throw new Error('Failed to initialize TypeScript language service')
    }

    // Register languageServiceInstance disposal
    context.subscriptions.push({
      dispose: () => {
        if (languageService && typeof languageService.disposeLanguageServices === 'function') {
          languageService.disposeLanguageServices()
        }
      },
    })

    registerDiagnostics(context)
    registerHoverProvider(context)
    registerCompletionProvider(context)
    registerSignatureHelpProvider(context)
    // registerCodeActionsProvider(context)

    // Other features

    // get element/renderer props from Blits codebase
    console.log('Parsing element props from Blits codebase')
    const isElementPropsReady = await completionItems.elementProps.parseProps()

    if (!isElementPropsReady) {
      // add completion provider for template section
      context.subscriptions.push(completionProviders.templateAttributes)
    }

    context.subscriptions.push(completionProviders.templateTags)

    // comment command wrapper for template section
    context.subscriptions.push(commands.commentCommand)

    // format template section on save
    context.subscriptions.push(formatters.templateFormatterOnSave)

    // create diagnostic collection for error checking
    const diagnosticsCollection = vscode.languages.createDiagnosticCollection('blits-template')
    errorChecking.checkForLoopIndexAsKey(context, diagnosticsCollection)

    // extension activated
    vscode.window.showInformationMessage(`Lightning Blits v${packageJSON.version} has been activated!`)
    console.log('Lightning Blits has been activated.')
  } catch (error) {
    console.error('Error activating Lightning Blits:', error)
    vscode.window.showErrorMessage(`Failed to activate Lightning Blits v${packageJSON.version}: ${error.message}`)
  }
}

function deactivate() {
  console.log('Lightning Blits is being deactivated.')
}

module.exports = {
  activate,
  deactivate,
}
