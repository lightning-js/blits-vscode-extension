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

let jsLanguageService = null
let tsLanguageService = null

function createLanguageServiceHost(options) {
  return {
    getScriptFileNames: () => {
      const scriptFiles = vscode.workspace.textDocuments
        .filter((doc) => ['javascript', 'typescript', 'blits'].includes(doc.languageId))
        .map((doc) => doc.uri.fsPath)
      const blitsFiles = Array.from(getAllVirtualFiles().keys())
      return [...scriptFiles, ...blitsFiles]
    },
    getScriptVersion: (fileName) => {
      const virtualFile = getVirtualFile(fileName)
      if (virtualFile) {
        return virtualFile.version.toString()
      }
      const doc = vscode.workspace.textDocuments.find((doc) => doc.uri.fsPath === fileName)
      return doc ? doc.version.toString() : '1'
    },
    getScriptSnapshot: (fileName) => {
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
          content = fs.readFileSync(fileName, 'utf8')
        }
      }

      return content ? ts.ScriptSnapshot.fromString(content) : undefined
    },
    getCurrentDirectory: () => vscode.workspace.workspaceFolders[0].uri.fsPath,
    getCompilationSettings: () => options,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
    resolveModuleNames: (moduleNames, containingFile) => {
      const currentCompilerOptions =
        path.extname(containingFile) === '.ts'
          ? compilerOptions.getTsCompilerOptions()
          : compilerOptions.getJsCompilerOptions()

      return moduleNames.map((moduleName) => {
        const result = ts.resolveModuleName(moduleName, containingFile, currentCompilerOptions, {
          fileExists: ts.sys.fileExists,
          readFile: ts.sys.readFile,
        })

        if (result.resolvedModule) {
          return result.resolvedModule
        }

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

        const blitsPath = path.resolve(path.dirname(containingFile), moduleName + blitsExtension)
        if (ts.sys.fileExists(blitsPath)) {
          const { lang } = getOrCreateVirtualDocument(blitsPath) || {}
          if (lang) {
            const virtualFileName = getVirtualFileName(vscode.Uri.file(blitsPath), lang)
            return { resolvedFileName: virtualFileName, extension: `.${lang}`, isExternalLibraryImport: false }
          }
          return { resolvedFileName: blitsPath, extension: blitsExtension, isExternalLibraryImport: false }
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
  const uri = vscode.Uri.file(fileName)
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
