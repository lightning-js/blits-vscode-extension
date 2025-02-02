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

// Built-in component types
const BUILTIN_COMPONENTS = ['Element', 'Text', 'Layout', 'RouterView', 'Component']

// Try to get framework attributes, fallback to hardcoded ones if not found
const frameworkAttributes = workspace.getFrameworkAttributes()

// Organized attribute definitions
const attributes = frameworkAttributes || {
  x: {
    attrType: 'regular',
    types: ['number'],
    defaultValue: 0,
    reactive: true,
    description:
      'The x position of the Element in pixels, relative to its parent - allows negative values and decimals.',
    usedIn: ['Element', 'Text', 'Layout', 'RouterView'],
  },
  y: {
    attrType: 'regular',
    types: ['number'],
    defaultValue: 0,
    reactive: true,
    description:
      'The y position of the Element in pixels, relative to its parent - allows negative values and decimals.',
    usedIn: ['Element', 'Text', 'Layout', 'RouterView'],
  },
  z: {
    attrType: 'regular',
    types: ['number'],
    defaultValue: 0,
    reactive: true,
    description: 'The z index of the element.',
    usedIn: ['Element', 'Text', 'Layout', 'RouterView'],
  },
  w: {
    attrType: 'regular',
    types: ['number'],
    defaultValue: 0,
    reactive: true,
    description: 'The width of the element in pixels. Allows negative values and decimals.',
    usedIn: ['Element', 'Text', 'RouterView'],
  },
  h: {
    attrType: 'regular',
    types: ['number'],
    defaultValue: 0,
    reactive: true,
    description: 'The height of the element in pixels, relative to its parent. Allows negative values and decimals.',
    usedIn: ['Element', 'Text', 'Layout', 'RouterView'],
  },
  zIndex: {
    attrType: 'regular',
    types: ['number'],
    defaultValue: 0,
    reactive: true,
    description: 'The z-index of the element.',
    usedIn: ['Element', 'Text', 'Layout', 'RouterView'],
  },
  width: {
    attrType: 'regular',
    types: ['number'],
    defaultValue: 0,
    reactive: true,
    description: 'The width of the element in pixels. Allows negative values and decimals.',
    usedIn: ['Element', 'Text', 'Layout', 'RouterView'],
  },
  height: {
    attrType: 'regular',
    types: ['number'],
    defaultValue: 0,
    reactive: true,
    description: 'The height of the element in pixels, relative to its parent. Allows negative values and decimals.',
    usedIn: ['Element', 'Text', 'Layout', 'RouterView'],
  },
  color: {
    attrType: 'regular',
    types: ['string'],
    defaultValue: 'transparent',
    reactive: true,
    description:
      'The color of the Element. Allows any hexadecimal, hexadecimal with alpha channel, hexadecimal shorthands, RGB, RGBA, and HTML color names.',
    usedIn: ['Element', 'Text', 'Layout', 'RouterView'],
  },
  alpha: {
    attrType: 'regular',
    types: ['number'],
    defaultValue: 1,
    reactive: true,
    description:
      'The alpha attribute controls the opacity of the element. Allows values equal to 0, 1, and between 0 and 1.',
    usedIn: ['Element', 'Text', 'Layout', 'RouterView'],
  },
  rotation: {
    attrType: 'regular',
    types: ['number'],
    defaultValue: 0,
    reactive: true,
    description: 'The rotation attribute rotates the Element. Allows both positive and negative values in degrees.',
    usedIn: ['Element', 'Text', 'Layout', 'RouterView'],
  },
  scale: {
    attrType: 'regular',
    types: ['number'],
    defaultValue: 1,
    reactive: true,
    description: 'The scale attribute scales the element. Allows any value greater than 0.',
    usedIn: ['Element', 'Text', 'Layout', 'RouterView'],
  },
  mount: {
    attrType: 'regular',
    types: ['number', { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } } }],
    defaultValue: 0,
    reactive: true,
    description:
      'The x or y position of the Element in pixels, relative to its parent. Allows values between 0 and 1 and decimals.',
    usedIn: ['Element', 'Text', 'Layout', 'RouterView'],
  },
  pivot: {
    attrType: 'regular',
    types: ['number', { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } } }],
    defaultValue: 0,
    reactive: true,
    description:
      'The x or y position of the pivot point in pixels, relative to its parent. Allows values between 0 and 1 and decimals.',
    usedIn: ['Element', 'Text', 'Layout', 'RouterView'],
  },
  clipping: {
    attrType: 'regular',
    types: ['enum'],
    values: ['true', 'false'],
    defaultValue: 'false',
    reactive: true,
    description:
      'The clipping attribute cuts off the element positioning within specified height and width. Possible values are true or false.',
    usedIn: ['Element', 'Text', 'Layout', 'RouterView'],
  },
  overflow: {
    attrType: 'regular',
    types: ['enum'],
    values: ['true', 'false'],
    defaultValue: 'true',
    reactive: true,
    description:
      'The overflow attribute allows the element to extend beyond the specified height and width. Possible values are true or false.',
    usedIn: ['Text'],
  },
  content: {
    attrType: 'regular',
    types: ['string'],
    defaultValue: null,
    reactive: true,
    description: 'The text to be displayed. Can be hardcoded text, a dynamic value, or a reactive value.',
    usedIn: ['Text'],
  },
  font: {
    attrType: 'regular',
    types: ['string'],
    defaultValue: 'sans-serif',
    reactive: true,
    description: 'The font family.',
    usedIn: ['Text'],
  },
  size: {
    attrType: 'regular',
    types: ['number'],
    defaultValue: 32,
    reactive: true,
    description: 'The size of a text element. Allows any number greater than or equal to zero.',
    usedIn: ['Text'],
  },
  letterspacing: {
    attrType: 'regular',
    types: ['number'],
    defaultValue: 0,
    reactive: true,
    description: 'Letter spacing in pixels. Allows any number greater than or equal to zero.',
    usedIn: ['Text'],
  },
  align: {
    attrType: 'regular',
    types: ['enum'],
    values: ['left', 'right', 'center'],
    defaultValue: null,
    reactive: true,
    description: 'Align position of the element.',
    usedIn: ['Text'],
  },
  wordwrap: {
    attrType: 'regular',
    types: ['number'],
    defaultValue: null,
    reactive: true,
    description: 'The maximum length of a line of text in pixels.',
    usedIn: ['Text'],
  },
  maxlines: {
    attrType: 'regular',
    types: ['number'],
    defaultValue: null,
    reactive: true,
    description: 'Maximum number of lines that will be displayed.',
    usedIn: ['Text'],
  },
  maxheight: {
    attrType: 'regular',
    types: ['number'],
    defaultValue: null,
    reactive: true,
    description: 'Maximum height of a text block; lines exceeding this height will not be displayed.',
    usedIn: ['Text'],
  },
  lineheight: {
    attrType: 'regular',
    types: ['number'],
    defaultValue: null,
    reactive: true,
    description: 'The spacing between lines in pixels.',
    usedIn: ['Text'],
  },
  contain: {
    attrType: 'regular',
    types: ['enum'],
    values: ['none', 'width', 'both'],
    defaultValue: 'none',
    reactive: true,
    description: 'The strategy for containing text within the bounds.',
    usedIn: ['Text'],
  },
  textoverflow: {
    attrType: 'regular',
    types: ['enum'],
    values: ['true', 'false'],
    defaultValue: 'false',
    reactive: true,
    description: 'The suffix to be added when text is cropped due to bounds limits. Defaults to ...',
    usedIn: ['Text'],
  },
  direction: {
    attrType: 'regular',
    types: ['enum'],
    values: ['horizontal', 'vertical'],
    defaultValue: 'horizontal',
    reactive: true,
    description: 'Controls the direction of content.',
    usedIn: ['Layout'],
  },
  gap: {
    attrType: 'regular',
    types: ['number'],
    defaultValue: null,
    reactive: true,
    description: 'Controls how much space will be added between each Element or Component.',
    usedIn: ['Element', 'Text', 'Layout', 'RouterView'],
  },
  is: {
    attrType: 'regular',
    types: ['string'],
    defaultValue: null,
    reactive: true,
    description: 'Dynamically instantiates a Component.',
    usedIn: ['Component'],
  },
  ref: {
    attrType: 'regular',
    types: ['string'],
    defaultValue: null,
    reactive: true,
    description: 'Refers to the Element or Component in the template.',
    usedIn: ['Element', 'Text', 'Layout', 'RouterView', 'Component'],
  },
  for: {
    attrType: 'regular',
    types: ['string'],
    defaultValue: null,
    reactive: true,
    description: 'Directive for repeating multiple instances of an Element or a Component.',
    usedIn: ['Element', 'Text', 'Layout', 'RouterView', 'Component'],
  },
  show: {
    attrType: 'regular',
    types: ['string'],
    defaultValue: null,
    reactive: true,
    description: 'Conditionally shows and hides Components and Elements.',
    usedIn: ['Element', 'Text', 'Layout', 'RouterView'],
  },
  'align-items': {
    attrType: 'regular',
    types: ['enum'],
    values: ['start', 'center', 'end'],
    defaultValue: null,
    reactive: true,
    description: 'Specifies how to align children on the opposite axis.',
    usedIn: ['Component', 'Element', 'Text', 'Layout', 'RouterView'],
  },
  padding: {
    attrType: 'regular',
    types: [
      'number',
      {
        type: 'object',
        properties: {
          top: { type: 'number' },
          bottom: { type: 'number' },
          left: { type: 'number' },
          right: { type: 'number' },
          x: { type: 'number' },
          y: { type: 'number' },
        },
      },
    ],
    defaultValue: null,
    reactive: true,
    description: 'Adds spacing between the content and the edges of the Layout Component.',
    usedIn: ['Element', 'Text', 'Layout', 'RouterView'],
  },
  '@loaded': {
    attrType: 'event',
    types: ['string'],
    defaultValue: null,
    reactive: false,
    description: 'Fires when an image or text element loads, providing its dimensions. Must be a function reference.',
    usedIn: ['Element', 'Text'],
  },
  '@error': {
    attrType: 'event',
    types: ['string'],
    defaultValue: null,
    reactive: false,
    description: ' Fires when an image fails to load, passing an error message. Must be a function reference.',
    usedIn: ['Element', 'Text'],
  },
}

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
