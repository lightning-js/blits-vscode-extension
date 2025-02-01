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
const templateHandler = require('../core/templateHandler')
const componentHandler = require('../core/componentHandler')
const componentNames = require('../completionItems/componentNames')
const elementProps = require('../completionItems/elementProps')
const componentProps = require('../completionItems/componentProps')
const { isBuiltInComponent } = require('../core/framework/attributes')

module.exports = vscode.languages.registerCompletionItemProvider(
  [{ language: 'javascript' }, { language: 'typescript' }, { language: 'blits' }],
  {
    async provideCompletionItems(document, position) {
      if (!templateHandler.isCursorInTemplate(document, position)) {
        return undefined
      }

      const line = document.lineAt(position).text
      const triggerChar = line[position.character - 1]
      const context = templateHandler.getTagContext(document, position)

      if (triggerChar === '<') {
        if (!templateHandler.shouldSuggestTags(document, position)) {
          return undefined
        }
        const componentData = await componentHandler.analyzeComponentsInDocument(document)
        return await componentNames.suggest(componentData)
      }

      // Only proceed if we're in a tag and the trigger is either space or colon or
      const prevChar = position.character > 1 ? line[position.character - 2] : ''
      if (!context.isInTag || !context.tagName || (prevChar !== ' ' && triggerChar !== ':' && triggerChar !== '@')) {
        return undefined
      }

      // If it's a built-in component, get its specific attributes
      if (isBuiltInComponent(context.tagName)) {
        if (triggerChar === '@') {
          return await elementProps.suggest(context.tagName, context.attributes, true)
        } else if (triggerChar === ':') {
          return await elementProps.suggest(context.tagName, context.attributes, false, true)
        }

        return await elementProps.suggest(context.tagName, context.attributes)
      }

      // For custom components, get their props + Element attributes
      return await componentProps.suggest(context.tagName, context.attributes, document)
    },
  },
  '<',
  ':',
  '@'
)
