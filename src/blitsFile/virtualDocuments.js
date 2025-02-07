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
const os = require('os')

const virtualFiles = new Map()
const isWindows = os.platform() === 'win32'

function normalizeFilePath(filePath) {
  return path.normalize(filePath)
}

function getFileKey(filePath) {
  const normalized = normalizeFilePath(filePath)
  return isWindows ? normalized.toLowerCase() : normalized
}

function addVirtualFile(fileName, content, version) {
  const key = getFileKey(fileName)
  virtualFiles.set(key, { fileName, content, version })
}

function getVirtualFile(fileName) {
  const key = getFileKey(fileName)
  const file = virtualFiles.get(key)
  return file ? { ...file, fileName: file.fileName } : undefined
}

function deleteVirtualFilesByUri(uri) {
  const normalizedUriPath = getFileKey(uri.fsPath)
  Array.from(virtualFiles.keys()).forEach((key) => {
    if (getFileKey(key).startsWith(normalizedUriPath)) {
      virtualFiles.delete(key)
    }
  })
}

function getAllVirtualFiles() {
  return new Map(Array.from(virtualFiles.entries()).map(([, value]) => [value.fileName, value]))
}

module.exports = {
  addVirtualFile,
  getVirtualFile,
  deleteVirtualFilesByUri,
  getAllVirtualFiles,
}
