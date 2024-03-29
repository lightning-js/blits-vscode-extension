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

const completionProviders = require('./completionProviders')
const commands = require('./commands')
const formatters = require('./formatters')

function activate(context) {
  // add completion provider for template section
  context.subscriptions.push(completionProviders.templateAttributes)

  // comment command wrapper for template section
  context.subscriptions.push(commands.commentCommand)

  // format template section on save
  context.subscriptions.push(formatters.templateFormatterOnSave)

  console.log('Lightning Blits has been activated.')
}

function deactivate() {
  console.log('Lightning Blits has been deactivated.')
}

module.exports = {
  activate,
  deactivate,
}
