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

const vscode = require('vscode')
const fs = require('fs')
const path = require('path')
const debounce = require('lodash/debounce')

let isBlits = false
let packageJsonWatcher = null

function checkPackageJson() {
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    isBlits = false
    return
  }

  const workspaceFolder = vscode.workspace.workspaceFolders[0]
  const packageJsonPath = path.join(workspaceFolder.uri.fsPath, 'package.json')

  fs.readFile(packageJsonPath, 'utf8', (err, data) => {
    if (err) {
      isBlits = false
      if (err.code !== 'ENOENT') {
        console.error('Error reading package.json:', err)
      }
      return
    }

    try {
      const pkg = JSON.parse(data)
      isBlits = hasBlitsDependency(pkg)
    } catch (parseError) {
      console.error('Error parsing package.json:', parseError)
      isBlits = false
    }
  })
}

function hasBlitsDependency(pkg) {
  const dependencyFields = ['dependencies', 'devDependencies', 'peerDependencies']
  return dependencyFields.some((field) => {
    return pkg[field] && pkg[field]['@lightningjs/blits']
  })
}
const debouncedCheck = debounce(checkPackageJson, 300)

function init() {
  checkPackageJson()

  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    console.warn('No workspace folder found.')
    return
  }

  // Create a watcher for package.json in the workspace root.
  const workspaceFolder = vscode.workspace.workspaceFolders[0]
  const pattern = new vscode.RelativePattern(workspaceFolder, 'package.json')
  packageJsonWatcher = vscode.workspace.createFileSystemWatcher(pattern)

  // Listen for changes, creations, and deletions of package.json.
  packageJsonWatcher.onDidChange(debouncedCheck)
  packageJsonWatcher.onDidCreate(debouncedCheck)
  packageJsonWatcher.onDidDelete(debouncedCheck)
}

function dispose() {
  if (packageJsonWatcher) {
    packageJsonWatcher.dispose()
  }
}

function isBlitsApp() {
  return isBlits
}

function getFrameworkAttributes() {
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    return false
  }

  const workspaceFolder = vscode.workspace.workspaceFolders[0]
  const attributesPath = path.join(
    workspaceFolder.uri.fsPath,
    'node_modules',
    '@lightningjs',
    'blits',
    'vscode',
    'data',
    'template-attributes.json'
  )

  try {
    const data = fs.readFileSync(attributesPath, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    return false
  }
}

module.exports = {
  init,
  dispose,
  isBlitsApp,
  getFrameworkAttributes,
}
