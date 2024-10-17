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

const path = require('path')

function getVirtualFileName(uri, lang) {
  const extension = lang === 'ts' ? 'ts' : 'js'
  let normalizedPath = uri.fsPath

  // Normalize the path (handles both forward and backslashes)
  normalizedPath = path.normalize(normalizedPath)

  // Replace .blits with .ts or .js
  if (normalizedPath.endsWith('.blits')) {
    normalizedPath = normalizedPath.slice(0, -6) // Remove '.blits'
  }

  // Ensure the path is absolute
  normalizedPath = path.resolve(normalizedPath)

  // Handle UNC paths
  if (normalizedPath.startsWith('\\\\')) {
    normalizedPath = normalizedPath.replace(/\\/g, '/')
  }

  return `${normalizedPath}.blits.${extension}`
}

module.exports = { getVirtualFileName }
