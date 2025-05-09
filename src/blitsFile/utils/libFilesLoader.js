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

const fs = require('fs')
const path = require('path')
const vscode = require('vscode')

// Cache for lib files contents
const libFilesCache = new Map()

// Get the TypeScript lib directory
function getTsLibPath() {
  try {
    // Get the extension path
    const extensionPath =
      vscode.extensions.getExtension('lightningjs.lightning-blits')?.extensionPath ||
      path.dirname(path.dirname(__dirname)) // Fallback: go up from src/blitsFile/utils

    // Use our bundled lib files
    const bundledLibPath = path.join(extensionPath, 'out', 'lib-files')

    if (fs.existsSync(bundledLibPath)) {
      return bundledLibPath
    }

    // Fallback to the extension's typescript installation
    return path.dirname(require.resolve('typescript/lib/typescript.js'))
  } catch (error) {
    console.error('Error finding TypeScript lib directory:', error)
    return null
  }
}

// Load the content of a single TypeScript lib file
function loadLibFile(fileName) {
  if (libFilesCache.has(fileName)) {
    return libFilesCache.get(fileName)
  }

  const tsLibPath = getTsLibPath()
  if (!tsLibPath) {
    console.error(`Could not find TypeScript lib directory for ${fileName}`)
    return null
  }

  const filePath = path.join(tsLibPath, fileName)
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8')
      libFilesCache.set(fileName, content)
      return content
    }
  } catch (error) {
    console.error(`Error loading TypeScript lib file ${fileName}:`, error)
  }

  console.error(`Failed to load ${fileName}`)
  return null
}

// Load all necessary lib files based on target
function getLibFilesForTarget(targetName = 'es2020') {
  const libFiles = new Map()

  // Basic libraries that should always be included
  const essentialLibs = [
    'lib.es5.d.ts',
    'lib.dom.d.ts',
    'lib.dom.iterable.d.ts',
    'lib.webworker.importscripts.d.ts',
    'lib.scripthost.d.ts',
  ]

  // Map ES target names to corresponding lib files
  const targetLibMap = {
    es2020: [
      'lib.es2020.d.ts',
      'lib.es2019.d.ts',
      'lib.es2018.d.ts',
      'lib.es2017.d.ts',
      'lib.es2016.d.ts',
      'lib.es2015.d.ts',
    ],
    es2019: ['lib.es2019.d.ts', 'lib.es2018.d.ts', 'lib.es2017.d.ts', 'lib.es2016.d.ts', 'lib.es2015.d.ts'],
    es2018: ['lib.es2018.d.ts', 'lib.es2017.d.ts', 'lib.es2016.d.ts', 'lib.es2015.d.ts'],
    es2017: ['lib.es2017.d.ts', 'lib.es2016.d.ts', 'lib.es2015.d.ts'],
    es2016: ['lib.es2016.d.ts', 'lib.es2015.d.ts'],
    es2015: ['lib.es2015.d.ts'],
    es6: ['lib.es2015.d.ts'],
    es5: [],
  }

  // Get all libs for the specified target (or fallback to es2020)
  const targetLibs = targetLibMap[targetName.toLowerCase()] || targetLibMap.es2020

  // Load essential libs
  for (const libFileName of essentialLibs) {
    const content = loadLibFile(libFileName)
    if (content) {
      const tsLibPath = getTsLibPath()
      const fullPath = path.join(tsLibPath, libFileName)
      libFiles.set(fullPath, content)
    }
  }

  // Load target-specific libs
  for (const libFileName of targetLibs) {
    const content = loadLibFile(libFileName)
    if (content) {
      const tsLibPath = getTsLibPath()
      const fullPath = path.join(tsLibPath, libFileName)
      libFiles.set(fullPath, content)
    }
  }

  return libFiles
}

module.exports = {
  getLibFilesForTarget,
  loadLibFile,
  getTsLibPath,
}
