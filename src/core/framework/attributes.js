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

const workspace = require('../workspaceHandler')
const templateAttributes = require('./template-attributes.json')

// Built-in component types
const BUILTIN_COMPONENTS = ['Element', 'Text', 'Layout', 'RouterView', 'Component']

// Try to get framework attributes, fallback to hardcoded ones if not found
const frameworkAttributes = workspace.getFrameworkAttributes()

// Organized attribute definitions
const attributes = frameworkAttributes || templateAttributes

const getAttributesForComponent = (componentType, onlyEventProps = false, onlyReactiveProps = false) => {
  return Object.entries(attributes).reduce((acc, [name, def]) => {
    if (def.usedIn.includes(componentType)) {
      if (onlyEventProps && def.attrType !== 'event') return acc
      if (onlyReactiveProps && !def.reactive) return acc
      if (!onlyEventProps && def.attrType === 'event') return acc
      acc[name] = def
    }
    return acc
  }, {})
}

const getAttributeDefinition = (attributeName) => attributes[attributeName] || null

const isBuiltInComponent = (componentType) => BUILTIN_COMPONENTS.includes(componentType)

const getCompletionDetails = (attributeName) => {
  const attr = getAttributeDefinition(attributeName)
  if (!attr) return null

  return {
    description: attr.description,
    defaultValue: attr.defaultValue,
    types: attr.types,
    values: attr.values,
  }
}

module.exports = {
  getAttributesForComponent,
  getAttributeDefinition,
  isBuiltInComponent,
  getCompletionDetails,
}
