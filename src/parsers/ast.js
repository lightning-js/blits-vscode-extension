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

const parser = require('@babel/parser')

// @ts-nocheck
const parseAST = (code, fileExtension) => {
  const plugins = ['classProperties', 'objectRestSpread', 'optionalChaining', 'nullishCoalescingOperator']

  if (fileExtension === 'ts' || fileExtension === 'tsx') {
    plugins.push('typescript')
  }

  try {
    return parser.parse(code, {
      sourceType: 'module',
      plugins: plugins,
      errorRecovery: true,
    })
  } catch (e) {
    console.error('Error parsing AST:', e)
    return null
  }
}

module.exports = parseAST
