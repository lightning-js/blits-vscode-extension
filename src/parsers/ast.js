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

module.exports = (code, fileExtension) => {
  let plugins = []
  if (fileExtension === 'ts') {
    plugins.push('typescript')
  }

  try {
    return parser.parse(code, {
      sourceType: 'module',
      plugins: plugins,
    })
  } catch (e) {
    console.error('error parsing AST')
    return null
  }
}
