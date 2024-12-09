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
const templateHelper = require('../helpers/template')
const completionItems = require('../completionItems')
const parse = require('../parsers')

const path = require('path')
const fs = require('fs')

// Get all local imports from a file
function getLocalImports(ast) {
  if (!ast || !ast.program || !ast.program.body) {
    console.warn('Invalid AST structure for imports analysis')
    return []
  }

  const imports = []

  try {
    ast.program.body.forEach((node) => {
      if (!node) return

      if (node.type === 'ImportDeclaration') {
        const importPath = safeGet(node, 'source', 'value')

        if (!importPath) return

        // Skip node_modules imports
        if (importPath.startsWith('.') || importPath.startsWith('/')) {
          const specifiers = []

          if (Array.isArray(node.specifiers)) {
            node.specifiers.forEach((specifier) => {
              if (!specifier || !specifier.type) return

              if (specifier.type === 'ImportDefaultSpecifier') {
                specifiers.push({
                  type: 'default',
                  local: safeGet(specifier, 'local', 'name'),
                })
              } else if (specifier.type === 'ImportSpecifier') {
                specifiers.push({
                  type: 'named',
                  imported: safeGet(specifier, 'imported', 'name'),
                  local: safeGet(specifier, 'local', 'name'),
                })
              }
            })
          }

          imports.push({
            specifiers,
            path: importPath,
          })
        }
      }
    })
  } catch (e) {
    console.error('Error processing imports:', e)
  }

  return imports
}

// Parse props with better error handling
function parseProps(propsNode) {
  const standardizedProps = []

  try {
    if (!propsNode) {
      console.debug('Props node is null or undefined')
      return standardizedProps
    }

    if (!propsNode.type) {
      console.warn('Props node has no type:', propsNode)
      return standardizedProps
    }

    if (propsNode.type === 'ArrayExpression' && Array.isArray(propsNode.elements)) {
      propsNode.elements.forEach((element, index) => {
        if (!element) return

        try {
          if (element.type === 'StringLiteral') {
            standardizedProps.push({
              key: element.value,
              default: null,
              required: false,
              cast: 'String',
            })
          } else if (element.type === 'ObjectExpression') {
            const prop = {
              key: '',
              default: null,
              required: false,
              cast: 'String',
            }

            element.properties.forEach((property) => {
              const keyName = safeGet(property, 'key', 'name')
              const value = property.value

              if (!keyName || !value) return

              if (keyName === 'key') {
                prop.key = value.type === 'StringLiteral' ? value.value : value.name
              }
              if (keyName === 'default') {
                prop.default = value.value
              }
              if (keyName === 'required') {
                prop.required = value.value
              }
              if (keyName === 'cast') {
                prop.cast = value.name
              }
            })

            if (prop.key) {
              standardizedProps.push(prop)
            }
          }
        } catch (e) {
          console.error(`Error processing prop at index ${index}:`, e)
        }
      })
    }
  } catch (e) {
    console.error('Error in parseProps:', e)
  }

  return standardizedProps
}

// Parse component config to get components and props
function parseComponentConfig(ast) {
  if (!ast || !ast.program || !ast.program.body) {
    console.warn('Invalid AST structure for component config analysis')
    return { components: {}, props: [] }
  }

  let components = {}
  let props = []

  try {
    ast.program.body.forEach((node) => {
      if (!node) return

      if (node.type === 'ExportDefaultDeclaration') {
        const declaration = node.declaration

        if (!declaration) return

        if (
          declaration.type === 'CallExpression' &&
          safeGet(declaration, 'callee', 'type') === 'MemberExpression' &&
          safeGet(declaration, 'callee', 'object', 'name') === 'Blits' &&
          ['Component', 'Application'].includes(safeGet(declaration, 'callee', 'property', 'name'))
        ) {
          // Get the config object (last argument)
          const args = declaration.arguments
          if (!Array.isArray(args) || args.length === 0) return

          const configArg = args[args.length - 1]

          if (configArg && configArg.type === 'ObjectExpression') {
            configArg.properties.forEach((prop) => {
              if (!prop || !prop.key || !prop.key.name) return

              if (prop.key.name === 'components' && prop.value && prop.value.type === 'ObjectExpression') {
                // Parse components object
                prop.value.properties.forEach((componentProp) => {
                  const componentName = safeGet(componentProp, 'key', 'name')
                  const componentValue = safeGet(componentProp, 'value', 'name')

                  if (componentName && componentValue) {
                    components[componentName] = componentValue
                  }
                })
              }

              if (prop.key.name === 'props') {
                props = parseProps(prop.value)
              }
            })
          }
        }
      }
    })
  } catch (e) {
    console.error('Error processing component config:', e)
  }

  return { components, props }
}

// Helper function to get the correct source code based on file type
function getSourceForAnalysis(sourceCode, fileExtension) {
  if (fileExtension === 'blits') {
    const { content, language } = templateHelper.getScriptContentForBlits(sourceCode)
    return {
      content,
      language,
    }
  }

  return {
    content: sourceCode,
    language: fileExtension,
  }
}

async function analyzeBlitsComponent(
  sourceCode,
  fileExtension = 'js',
  currentFilePath = '',
  analyzedPaths = new Set()
) {
  try {
    const { content, language } = getSourceForAnalysis(sourceCode, fileExtension)
    const ast = parse.AST(content, language)

    if (!ast) {
      return {
        imports: [],
        components: {},
        props: [],
        importedComponents: [],
      }
    }

    // Get imports and component config for current file
    const imports = getLocalImports(ast)
    const { components, props } = parseComponentConfig(ast)

    // Track analyzed paths to prevent circular dependencies
    analyzedPaths.add(currentFilePath)

    // Analyze imported components
    const importedComponents = []
    for (const imp of imports) {
      if (imp.path.startsWith('.')) {
        // Resolve absolute path for the import
        const importDir = path.dirname(currentFilePath)
        const absolutePath = path.resolve(importDir, imp.path)
        const resolvedPath = resolveFilePath(absolutePath)

        if (resolvedPath && !analyzedPaths.has(resolvedPath)) {
          try {
            const importedCode = fs.readFileSync(resolvedPath, 'utf-8')
            const importFileExt = path.extname(resolvedPath).slice(1)

            const importAnalysis = await analyzeBlitsComponent(importedCode, importFileExt, resolvedPath, analyzedPaths)

            // Add imported component info
            imp.specifiers.forEach((spec) => {
              const isUsedInComponents =
                Object.prototype.hasOwnProperty.call(components, spec.local) ||
                Object.values(components).includes(spec.local)

              importedComponents.push({
                name: spec.local,
                importPath: imp.path,
                absolutePath: resolvedPath,
                isUsedInComponents,
                props: importAnalysis.props,
                fileType: importFileExt,
              })
            })
          } catch (e) {
            console.error(`Error analyzing imported component ${resolvedPath}:`, e)
          }
        }
      }
    }

    return {
      imports,
      components,
      props,
      importedComponents,
    }
  } catch (e) {
    console.error('Error in analyzeBlitsComponent:', e)
    return {
      imports: [],
      components: {},
      props: [],
      importedComponents: [],
    }
  }
}

// Helper to resolve file path with extensions
function resolveFilePath(basePath) {
  const extensions = ['.js', '.ts', '.blits']

  // Try exact path first
  if (fs.existsSync(basePath)) return basePath

  // Try with extensions
  for (const ext of extensions) {
    const pathWithExt = basePath + ext
    if (fs.existsSync(pathWithExt)) return pathWithExt
  }

  return null
}

function safeGet(obj, ...paths) {
  let current = obj
  for (const path of paths) {
    if (current == null) return undefined
    current = current[path]
  }
  return current
}

const getCompletionItems = async (document, currentDoc, position, isBlits, filePath, fileExt) => {
  let isCursorInsideTemplate = false
  if (isBlits) {
    isCursorInsideTemplate = templateHelper.isCursorInsideTemplateForBlits(document, currentDoc, position)
  } else {
    const ast = parse.AST(currentDoc, fileExt)
    isCursorInsideTemplate = templateHelper.isCursorInsideTemplate(document, ast, position)
  }

  if (isCursorInsideTemplate) {
    const componentData = await analyzeBlitsComponent(currentDoc, fileExt, filePath)
    return await completionItems.componentNames.suggest(componentData)
  }

  return []
}

module.exports = vscode.languages.registerCompletionItemProvider(
  [{ language: 'javascript' }, { language: 'typescript' }, { language: 'blits' }],
  {
    async provideCompletionItems(document, position) {
      const filePath = document.uri.fsPath
      const fileExtension = filePath.split('.').pop()
      const currentDoc = document.getText()

      const isBlits = document.languageId === 'blits'
      return await getCompletionItems(document, currentDoc, position, isBlits, filePath, fileExtension)
    },
  },
  '<'
)
