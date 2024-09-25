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

function extractScriptContent(text) {
  const scriptTagRegex = /<script(?:\s+lang="(ts|js)")?>([\s\S]*?)<\/script>/
  const match = scriptTagRegex.exec(text)

  if (!match) return null

  const lang = match[1] || 'js'
  const scriptContent = match[2]
  const scriptStartIndex = match.index + match[0].indexOf('>') + 1

  return {
    lang,
    content: scriptContent,
    startIndex: scriptStartIndex,
  }
}

module.exports = {
  extractScriptContent,
}
