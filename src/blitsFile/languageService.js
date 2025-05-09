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
const fs = require('fs')
const path = require('path')
const { getAllVirtualFiles, addVirtualFile, getVirtualFile } = require('./virtualDocuments')
const compilerOptions = require('./config/compilerOptions')
const { extractScriptContent } = require('./utils/scriptExtractor')
const { getVirtualFileName } = require('./utils/fileNameGenerator')
const { getLibFilesForTarget, getTsLibPath } = require('./utils/libFilesLoader')

let jsLanguageService = null
let tsLanguageService = null

function createLanguageServiceHost(options) {
  // Load TypeScript lib files based on the target in compiler options
  const targetName = ts.ScriptTarget[options.target] || 'ES2020'
  const libFiles = getLibFilesForTarget(targetName)
  const libFileNames = Array.from(libFiles.keys())

  return {
    getScriptFileNames: () => {
      const scriptFiles = vscode.workspace.textDocuments
        .filter((doc) => ['javascript', 'typescript', 'blits'].includes(doc.languageId))
        .map((doc) => doc.uri.fsPath)
      const blitsFiles = Array.from(getAllVirtualFiles().keys())
      // Include lib files in the script files list
      return [...scriptFiles, ...blitsFiles, ...libFileNames]
    },
    getScriptVersion: (fileName) => {
      // Lib files version never changes
      if (libFiles.has(fileName)) {
        return '1'
      }

      const virtualFile = getVirtualFile(fileName)
      if (virtualFile) {
        return virtualFile.version.toString()
      }
      const doc = vscode.workspace.textDocuments.find((doc) => doc.uri.fsPath === fileName)
      return doc ? doc.version.toString() : '1'
    },
    getScriptSnapshot: (fileName) => {
      // For lib files, return the cached content
      if (libFiles.has(fileName)) {
        return ts.ScriptSnapshot.fromString(libFiles.get(fileName))
      }

      let content

      if (path.extname(fileName) === '.blits') {
        const { virtualFile } = getOrCreateVirtualDocument(fileName) || {}
        if (virtualFile) {
          content = virtualFile.content
        }
      } else {
        const virtualFile = getVirtualFile(fileName)
        if (virtualFile) {
          content = virtualFile.content
        } else if (fs.existsSync(fileName)) {
          try {
            content = fs.readFileSync(fileName, 'utf8')
          } catch (error) {
            console.error(`Error reading file ${fileName}:`, error)
            return undefined
          }
        }
      }

      return content ? ts.ScriptSnapshot.fromString(content) : undefined
    },
    getCurrentDirectory: () => {
      return vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
        ? vscode.workspace.workspaceFolders[0].uri.fsPath
        : process.cwd()
    },
    getCompilationSettings: () => options,
    getDefaultLibFileName: (options) => {
      const tsLibPath = getTsLibPath()
      if (tsLibPath) {
        return path.join(tsLibPath, ts.getDefaultLibFileName(options))
      }
      return ts.getDefaultLibFilePath(options)
    },
    fileExists: (fileName) => {
      // Lib files always exist
      if (libFiles.has(fileName)) {
        return true
      }

      // Check virtual files
      if (getVirtualFile(fileName)) {
        return true
      }

      // Check real files
      return ts.sys.fileExists(fileName)
    },
    readFile: (fileName) => {
      // For lib files, return the cached content
      if (libFiles.has(fileName)) {
        return libFiles.get(fileName)
      }

      // Check virtual files
      const virtualFile = getVirtualFile(fileName)
      if (virtualFile) {
        return virtualFile.content
      }

      // Check real files
      try {
        return ts.sys.readFile(fileName)
      } catch (error) {
        console.error(`Error reading file ${fileName}:`, error)
        return undefined
      }
    },
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
    resolveModuleNames: (moduleNames, containingFile) => {
      // Get the appropriate compiler options based on the file extension
      const currentCompilerOptions =
        path.extname(containingFile) === '.ts'
          ? compilerOptions.getTsCompilerOptions()
          : compilerOptions.getJsCompilerOptions()

      return moduleNames.map((moduleName) => {
        // Try to use TypeScript's resolver first
        const result = ts.resolveModuleName(moduleName, containingFile, currentCompilerOptions, {
          fileExists: (fileName) => {
            if (libFiles.has(fileName)) return true
            if (getVirtualFile(fileName)) return true
            return ts.sys.fileExists(fileName)
          },
          readFile: (fileName) => {
            if (libFiles.has(fileName)) return libFiles.get(fileName)
            const virtualFile = getVirtualFile(fileName)
            if (virtualFile) return virtualFile.content
            return ts.sys.readFile(fileName)
          },
          directoryExists: ts.sys.directoryExists,
          getCurrentDirectory: () => currentCompilerOptions.baseUrl || process.cwd(),
        })

        if (result.resolvedModule) {
          return result.resolvedModule
        }

        // Handle .blits files
        const blitsExtension = '.blits'
        if (moduleName.endsWith(blitsExtension)) {
          const fullPath = path.resolve(path.dirname(containingFile), moduleName)
          if (ts.sys.fileExists(fullPath)) {
            const { lang } = getOrCreateVirtualDocument(fullPath) || {}
            if (lang) {
              const virtualFileName = getVirtualFileName(vscode.Uri.file(fullPath), lang)
              return { resolvedFileName: virtualFileName, extension: `.${lang}`, isExternalLibraryImport: false }
            }
            return { resolvedFileName: fullPath, extension: blitsExtension, isExternalLibraryImport: false }
          }
        }

        // Try to find .blits extension if none is specified
        const blitsPath = path.resolve(path.dirname(containingFile), moduleName + blitsExtension)
        if (ts.sys.fileExists(blitsPath)) {
          const { lang } = getOrCreateVirtualDocument(blitsPath) || {}
          if (lang) {
            const virtualFileName = getVirtualFileName(vscode.Uri.file(blitsPath), lang)
            return { resolvedFileName: virtualFileName, extension: `.${lang}`, isExternalLibraryImport: false }
          }
          return { resolvedFileName: blitsPath, extension: blitsExtension, isExternalLibraryImport: false }
        }

        // Handle path aliases (from tsconfig/jsconfig)
        try {
          if (moduleName.startsWith('@') && currentCompilerOptions.paths) {
            // Find the base URL - default to the directory containing the config file
            const baseUrl = currentCompilerOptions.baseUrl || process.cwd()

            // Check each path pattern
            for (const [pattern, targets] of Object.entries(currentCompilerOptions.paths)) {
              // Convert glob pattern to regex
              const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '(.*)') + '$')
              const match = moduleName.match(regexPattern)

              if (match && targets.length > 0) {
                // Replace the wildcard with the matched part
                const target = targets[0].replace(/\*/g, match[1] || '')

                // Resolve the full path using baseUrl
                const resolvedPath = path.resolve(baseUrl, target)

                // Check different possible extensions
                const extensions = ['.ts', '.tsx', '.js', '.jsx', '.blits', '']
                for (const ext of extensions) {
                  const fullPath = resolvedPath + ext
                  if (fs.existsSync(fullPath)) {
                    // If it's a .blits file, create a virtual document
                    if (fullPath.endsWith('.blits')) {
                      const { lang } = getOrCreateVirtualDocument(fullPath) || {}
                      if (lang) {
                        const virtualFileName = getVirtualFileName(vscode.Uri.file(fullPath), lang)
                        return {
                          resolvedFileName: virtualFileName,
                          extension: `.${lang}`,
                          isExternalLibraryImport: false,
                        }
                      }
                    }

                    // Normal case - just the filename with extension
                    const extension = path.extname(fullPath) || '.js'
                    return { resolvedFileName: fullPath, extension, isExternalLibraryImport: false }
                  }
                }

                // If we find a directory, look for index files
                if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
                  for (const ext of extensions) {
                    const indexPath = path.join(resolvedPath, 'index' + ext)
                    if (fs.existsSync(indexPath)) {
                      const extension = path.extname(indexPath) || '.js'
                      return { resolvedFileName: indexPath, extension, isExternalLibraryImport: false }
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error resolving path alias for ${moduleName}:`, error)
        }

        return undefined
      })
    },
  }
}

function initializeJsLanguageService() {
  if (!jsLanguageService) {
    const jsLanguageServiceHost = createLanguageServiceHost(compilerOptions.getJsCompilerOptions())
    jsLanguageService = ts.createLanguageService(jsLanguageServiceHost, ts.createDocumentRegistry())
    console.log('JavaScript Language Service initialized.')
  }
  return jsLanguageService
}

function initializeTsLanguageService() {
  if (!tsLanguageService) {
    const tsLanguageServiceHost = createLanguageServiceHost(compilerOptions.getTsCompilerOptions())
    tsLanguageService = ts.createLanguageService(tsLanguageServiceHost, ts.createDocumentRegistry())
    console.log('TypeScript Language Service initialized.')
  }
  return tsLanguageService
}

function getLanguageService(fileName) {
  const ext = path.extname(fileName)
  if (ext === '.ts' || ext === '.tsx') {
    return initializeTsLanguageService()
  } else if (ext === '.js' || ext === '.jsx') {
    return initializeJsLanguageService()
  }
  if (ext === '.blits') {
    const { lang } = getOrCreateVirtualDocument(fileName) || {}
    return lang === 'ts' ? initializeTsLanguageService() : initializeJsLanguageService()
  }
  return null
}

function getOrCreateVirtualDocument(fileName) {
  try {
    const uri = vscode.Uri.file(fileName)

    // Check if the file exists
    if (!fs.existsSync(fileName)) {
      return null
    }

    const content = fs.readFileSync(fileName, 'utf8')
    const scriptInfo = extractScriptContent(content)

    if (!scriptInfo) return null

    const { lang, content: scriptContent } = scriptInfo
    const virtualFileName = getVirtualFileName(uri, lang)
    let virtualFile = getVirtualFile(virtualFileName)

    if (!virtualFile) {
      addVirtualFile(virtualFileName, scriptContent, 1)
      virtualFile = { content: scriptContent, version: 1 }
    }

    return { virtualFile, lang }
  } catch (error) {
    console.error(`Error creating virtual document for ${fileName}:`, error)
    return null
  }
}

compilerOptions.onDidChangeCompilerOptions(() => {
  if (jsLanguageService) {
    jsLanguageService.dispose()
    jsLanguageService = null
  }
  if (tsLanguageService) {
    tsLanguageService.dispose()
    tsLanguageService = null
  }
  // They will be re-initialized on next use with new compiler options
})

function disposeLanguageServices() {
  if (jsLanguageService) {
    jsLanguageService.dispose()
    jsLanguageService = null
    console.log('JavaScript Language Service disposed.')
  }
  if (tsLanguageService) {
    tsLanguageService.dispose()
    tsLanguageService = null
    console.log('TypeScript Language Service disposed.')
  }
  compilerOptions.dispose()
}

function getLanguageServiceInstance() {
  return {
    getLanguageService,
    disposeLanguageServices,
  }
}

module.exports = { getLanguageServiceInstance }
