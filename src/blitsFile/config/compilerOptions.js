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

const ts = require('typescript')
const vscode = require('vscode')
const path = require('path')
const fs = require('fs')

function log(message) {
  console.log(`[CompilerOptions] ${message}`)
}

function getProjectRoot() {
  const workspaceFolders = vscode.workspace.workspaceFolders
  return workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : process.cwd()
}

const projectRoot = getProjectRoot()

const baseCompilerOptions = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.ES2020,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  esModuleInterop: true,
  noEmit: true,
  allowArbitraryExtensions: true,
  allowNonTsExtensions: true,
  baseUrl: projectRoot,
  paths: {
    '*': ['node_modules/*'],
    '*.blits': 'blits.d.ts',
  },
  include: ['blits.d.ts', '**/*.ts', '**/*.js', '**/*.blits'],
  resolveJsonModule: true,
}

const jsSpecificOptions = {
  allowJs: true,
  checkJs: true,
}

const tsSpecificOptions = {
  strict: false,
  noUnusedLocals: false,
  noUnusedParameters: false,
}

function getTsProjectConfig() {
  const tsConfigPath = path.join(projectRoot, 'tsconfig.json')

  if (fs.existsSync(tsConfigPath)) {
    log(`Found tsconfig.json at ${tsConfigPath}`)
    const rawConfig = ts.readConfigFile(tsConfigPath, ts.sys.readFile)
    if (rawConfig.error) {
      log(`Error reading tsconfig.json: ${JSON.stringify(rawConfig.error)}`)
      return {}
    }
    //read compilerOptions, fallback to root if not present
    const config = rawConfig.config.compilerOptions ? rawConfig.config.compilerOptions : rawConfig.config
    if (!rawConfig.config.compilerOptions) {
      log('Warning: compilerOptions key not found in tsconfig.json. Attempting to read root level options.')
    }
    return config || {}
  } else {
    log('No tsconfig.json found')
    return {}
  }
}

function getJsProjectConfig() {
  const jsConfigPath = path.join(projectRoot, 'jsconfig.json')

  if (fs.existsSync(jsConfigPath)) {
    log(`Found jsconfig.json at ${jsConfigPath}`)
    const rawConfig = ts.readConfigFile(jsConfigPath, ts.sys.readFile)
    if (rawConfig.error) {
      log(`Error reading jsconfig.json: ${JSON.stringify(rawConfig.error)}`)
      return {}
    }
    const config = rawConfig.config.compilerOptions ? rawConfig.config.compilerOptions : {}
    if (!rawConfig.config.compilerOptions) {
      log('Warning: compilerOptions key not found in jsconfig.json.')
    }
    return config || {}
  } else {
    log('No jsconfig.json found')
    return {}
  }
}

function mergeCompilerOptions(baseOptions, specificOptions, userOptions = {}) {
  const merged = { ...(baseOptions || {}), ...(specificOptions || {}) }

  for (const [key, value] of Object.entries(userOptions || {})) {
    if (value === undefined || value === null) continue

    if (key === 'target' || key === 'module') {
      // Ensure that the target and module are at least as advanced as the user specifies
      merged[key] = Math.max(merged[key], value)
    } else if (Array.isArray(value) && Array.isArray(merged[key])) {
      // Merge arrays without duplicates
      merged[key] = [...new Set([...merged[key], ...value])]
    } else if (key === 'paths' && typeof value === 'object' && merged[key]) {
      // Deep merge 'paths'
      merged[key] = { ...merged[key], ...value }
    } else if (key === 'include' && Array.isArray(value)) {
      // Merge 'include' arrays without duplicates
      merged[key] = [...new Set([...(merged[key] || []), ...value])]
    } else {
      // For other keys, allow user to override
      merged[key] = value
    }
  }

  // Re-apply critical options to ensure they aren't overridden by user configurations
  merged.noEmit = true
  merged.allowArbitraryExtensions = true
  merged.allowNonTsExtensions = true
  merged.moduleResolution = ts.ModuleResolutionKind.NodeNext
  merged.esModuleInterop = true
  merged.baseUrl = projectRoot

  // Ensure 'paths' and 'include' have default values if not set
  merged.paths = merged.paths || {}
  merged.paths['*'] = [...new Set([...(merged.paths['*'] || []), 'node_modules/*'])]

  merged.include = [...new Set([...(merged.include || []), 'blits.d.ts', '**/*.ts', '**/*.js', '**/*.blits'])]

  return merged
}

let jsCompilerOptions = null
let tsCompilerOptions = null
let configWatcher = null
const onDidChangeCompilerOptionsCallbacks = []

// Debounce variables
let updateTimeout = null
const UPDATE_DELAY = 300 // milliseconds

function updateCompilerOptions() {
  const tsUserConfig = getTsProjectConfig()
  const jsUserConfig = getJsProjectConfig()

  tsCompilerOptions = mergeCompilerOptions(baseCompilerOptions, tsSpecificOptions, tsUserConfig)
  jsCompilerOptions = mergeCompilerOptions(baseCompilerOptions, jsSpecificOptions, jsUserConfig)

  notifyCompilerOptionsChanged()
}

function setupConfigWatcher() {
  if (configWatcher) {
    configWatcher.dispose()
  }

  const configPattern = new vscode.RelativePattern(projectRoot, '{tsconfig.json,jsconfig.json}')
  configWatcher = vscode.workspace.createFileSystemWatcher(configPattern)

  // Debounce the updateCompilerOptions calls
  const scheduleUpdate = () => {
    if (updateTimeout) {
      clearTimeout(updateTimeout)
    }
    updateTimeout = setTimeout(() => {
      log('Configuration file change detected. Updating compiler options...')
      updateCompilerOptions()
    }, UPDATE_DELAY)
  }

  configWatcher.onDidCreate(() => {
    log('Configuration file created.')
    scheduleUpdate()
  })
  configWatcher.onDidChange(() => {
    log('Configuration file changed.')
    scheduleUpdate()
  })
  configWatcher.onDidDelete(() => {
    log('Configuration file deleted.')
    scheduleUpdate()
  })
}

function getJsCompilerOptions() {
  return jsCompilerOptions
}

function getTsCompilerOptions() {
  return tsCompilerOptions
}

function onDidChangeCompilerOptions(callback) {
  onDidChangeCompilerOptionsCallbacks.push(callback)
  return {
    dispose: () => {
      const index = onDidChangeCompilerOptionsCallbacks.indexOf(callback)
      if (index !== -1) {
        onDidChangeCompilerOptionsCallbacks.splice(index, 1)
      }
    },
  }
}

function notifyCompilerOptionsChanged() {
  for (const callback of onDidChangeCompilerOptionsCallbacks) {
    callback()
  }
}

function dispose() {
  if (configWatcher) {
    configWatcher.dispose()
  }
}

// Initialize
updateCompilerOptions()
setupConfigWatcher()

module.exports = {
  getJsCompilerOptions,
  getTsCompilerOptions,
  onDidChangeCompilerOptions,
  dispose,
}
