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

const parseAST = (code, fileExtension) => {
  const pluginList = ['objectRestSpread', 'optionalChaining', 'nullishCoalescingOperator']

  if (fileExtension === 'ts' || fileExtension === 'tsx') {
    pluginList.push('typescript')
  }

  try {
    return parser.parse(code, {
      sourceType: 'module',
      plugins: pluginList,
      errorRecovery: true,
    })
  } catch (e) {
    console.error('Error parsing AST:', e)
    return null
  }
}

module.exports = parseAST
