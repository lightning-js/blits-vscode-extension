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

const parseAST = require('../parsers/parseAST')
const path = require('path')
const fs = require('fs')
const documentHandler = require('./documentHandler')

const analyzeComponentsInDocument = async (document, analyzedPaths = new Set(), importChain = []) => {
  const sourceCode = document.getText()
  const fileExt = document.uri.fsPath.split('.').pop()
  return await analyzeComponent(sourceCode, fileExt, document.uri.fsPath, analyzedPaths, importChain)
}

const analyzeComponent = async (
  sourceCode,
  fileExtension = 'js',
  currentFilePath = '',
  analyzedPaths = new Set(),
  importChain = []
) => {
  try {
    // Check for circular imports by looking for the current file in the import chain
    if (importChain.includes(currentFilePath)) {
      console.warn(`Circular import detected: ${importChain.join(' -> ')} -> ${currentFilePath}`)
      return _getEmptyAnalysis()
    }

    const { content, language } = _getSourceContent(sourceCode, fileExtension)
    const ast = parseAST(content, language)

    if (!ast) {
      return _getEmptyAnalysis()
    }

    const imports = _getLocalImports(ast)
    const { components, props } = _parseComponentConfig(ast)

    analyzedPaths.add(currentFilePath)

    // Add current file to import chain for cycle detection
    const updatedImportChain = [...importChain, currentFilePath]

    const importedComponents = []
    for (const imp of imports) {
      if (imp.path.startsWith('.')) {
        const resolvedPath = _resolveImportPath(currentFilePath, imp.path)

        if (resolvedPath && !analyzedPaths.has(resolvedPath)) {
          try {
            const importedCode = fs.readFileSync(resolvedPath, 'utf-8')
            const importFileExt = path.extname(resolvedPath).slice(1)

            const importAnalysis = await analyzeComponent(
              importedCode,
              importFileExt,
              resolvedPath,
              analyzedPaths,
              updatedImportChain
            )

            imp.specifiers.forEach((spec) => {
              importedComponents.push({
                name: spec.local,
                importPath: imp.path,
                absolutePath: resolvedPath,
                isUsedInComponents:
                  Object.prototype.hasOwnProperty.call(components, spec.local) ||
                  Object.values(components).includes(spec.local),
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
    console.error('Error in analyzeComponent:', e)
    return _getEmptyAnalysis()
  }
}

const _getSourceContent = (sourceCode, fileExtension) => {
  if (fileExtension === 'blits') {
    const { content, language } = documentHandler.getBlitsScript(sourceCode)
    return { content, language }
  }
  return {
    content: sourceCode,
    language: fileExtension,
  }
}

const _getLocalImports = (ast) => {
  if (!ast?.program?.body) {
    console.warn('Invalid AST structure for imports analysis')
    return []
  }

  const imports = []
  try {
    ast.program.body.forEach((node) => {
      if (!node) return

      if (node.type === 'ImportDeclaration') {
        const importPath = _safeGet(node, 'source', 'value')
        if (!importPath) return

        if (importPath.startsWith('.') || importPath.startsWith('/')) {
          const specifiers = _getImportSpecifiers(node)
          imports.push({ specifiers, path: importPath })
        }
      }
    })
  } catch (e) {
    console.error('Error processing imports:', e)
  }
  return imports
}

const _getImportSpecifiers = (node) => {
  const specifiers = []
  if (Array.isArray(node.specifiers)) {
    node.specifiers.forEach((specifier) => {
      if (!specifier?.type) return

      if (specifier.type === 'ImportDefaultSpecifier') {
        specifiers.push({
          type: 'default',
          local: _safeGet(specifier, 'local', 'name'),
        })
      } else if (specifier.type === 'ImportSpecifier') {
        specifiers.push({
          type: 'named',
          imported: _safeGet(specifier, 'imported', 'name'),
          local: _safeGet(specifier, 'local', 'name'),
        })
      }
    })
  }
  return specifiers
}

const _parseComponentConfig = (ast) => {
  if (!ast?.program?.body) {
    console.warn('Invalid AST structure for component config analysis')
    return { components: {}, props: [] }
  }

  let components = {}
  let props = []

  try {
    ast.program.body.forEach((node) => {
      if (node?.type !== 'ExportDefaultDeclaration') return

      const declaration = node.declaration
      if (!_isBlitsComponentDeclaration(declaration)) return

      const configArg = declaration.arguments[declaration.arguments.length - 1]
      if (configArg?.type === 'ObjectExpression') {
        configArg.properties.forEach((prop) => {
          const propName = _safeGet(prop, 'key', 'name')
          if (!propName) return

          if (propName === 'components') {
            components = _parseComponentsObject(prop.value)
          } else if (propName === 'props') {
            props = _parseProps(prop.value)
          }
        })
      }
    })
  } catch (e) {
    console.error('Error processing component config:', e)
  }

  return { components, props }
}

const _parseComponentsObject = (objectExpression) => {
  const components = {}
  if (objectExpression?.type === 'ObjectExpression') {
    objectExpression.properties.forEach((prop) => {
      const componentName = _safeGet(prop, 'key', 'name')
      const componentValue = _safeGet(prop, 'value', 'name')
      if (componentName && componentValue) {
        components[componentName] = componentValue
      }
    })
  }
  return components
}

const _parseProps = (propsNode) => {
  const standardizedProps = []

  try {
    if (!propsNode?.type) return standardizedProps

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
            const prop = _parseArrayObjectProp(element)
            if (prop.key) {
              standardizedProps.push(prop)
            }
          }
        } catch (e) {
          console.error(`Error processing prop at index ${index}:`, e)
        }
      })
    }
    // Handle object-based props (new format)
    else if (propsNode.type === 'ObjectExpression' && Array.isArray(propsNode.properties)) {
      propsNode.properties.forEach((property, index) => {
        if (!property) return

        try {
          const propName = _safeGet(property, 'key', 'name') || _safeGet(property, 'key', 'value')
          if (!propName) return

          const prop = _parseObjectPropValue(property)
          if (prop.key) {
            standardizedProps.push(prop)
          }
        } catch (e) {
          console.error(`Error processing object prop at index ${index}:`, e)
        }
      })
    }
  } catch (e) {
    console.error('Error in parseProps:', e)
  }

  return standardizedProps
}

// Parse JSDoc comments to extract type and default value information
const _parseJSDocComment = (leadingComments) => {
  if (!leadingComments || !Array.isArray(leadingComments) || leadingComments.length === 0) {
    return { type: null, defaultValue: null }
  }

  const comment = leadingComments[0].value

  // Extract @type annotation
  const typeMatch = comment.match(/@type\s+\{([^}]+)\}/)
  const type = typeMatch ? typeMatch[1].trim() : null

  // Extract @default annotation
  const defaultMatch = comment.match(/@default\s+(.+)(\r?\n|$)/)
  const defaultValue = defaultMatch ? defaultMatch[1].trim().replace(/^['"](.*)['"]$/, '$1') : null

  return {
    type,
    defaultValue,
  }
}

// Parse object-based prop value (new format)
const _parseObjectPropValue = (property) => {
  const propName = _safeGet(property, 'key', 'name') || _safeGet(property, 'key', 'value')
  const valueNode = property.value

  const prop = {
    key: propName,
    default: null,
    required: false,
    cast: 'String', // Default type
  }

  // Extract default value from the property value
  if (valueNode) {
    if (valueNode.type === 'StringLiteral') {
      prop.default = valueNode.value
      prop.cast = 'String'
    } else if (valueNode.type === 'NumericLiteral') {
      prop.default = valueNode.value
      prop.cast = 'Number'
    } else if (valueNode.type === 'BooleanLiteral') {
      prop.default = valueNode.value
      prop.cast = 'Boolean'
    } else if (valueNode.type === 'NullLiteral') {
      prop.default = null
    } else if (valueNode.type === 'Identifier' && valueNode.name === 'undefined') {
      prop.default = null
    }
  }

  // Parse JSDoc comments if available
  if (property.leadingComments) {
    const { type, defaultValue } = _parseJSDocComment(property.leadingComments)

    // Override type from JSDoc if available
    if (type) {
      // Map common type names to Blits cast types
      const typeMap = {
        string: 'String',
        number: 'Number',
        boolean: 'Boolean',
        object: 'Object',
        array: 'Array',
        function: 'Function',
      }

      prop.cast = typeMap[type.toLowerCase()] || type
    }

    // Use JSDoc default value if no literal value is provided
    if (defaultValue !== null && prop.default === null) {
      // Try to convert the default value to the appropriate type
      if (prop.cast === 'Number') {
        const num = Number(defaultValue)
        prop.default = isNaN(num) ? defaultValue : num
      } else if (prop.cast === 'Boolean') {
        prop.default = defaultValue === 'true'
      } else {
        prop.default = defaultValue
      }
    }
  }

  // If the property has a value that's not undefined, it's not required
  prop.required = prop.default === null && valueNode.type === 'Identifier' && valueNode.name === 'undefined'

  return prop
}

// Parse object prop in array format (original format)
const _parseArrayObjectProp = (element) => {
  const prop = {
    key: '',
    default: null,
    required: false,
    cast: 'String',
  }

  element.properties.forEach((property) => {
    const keyName = _safeGet(property, 'key', 'name')
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

  return prop
}

const _resolveImportPath = (currentFilePath, importPath) => {
  const importDir = path.dirname(currentFilePath)
  const absolutePath = path.resolve(importDir, importPath)
  return _resolveFilePathWithExtensions(absolutePath)
}

const _resolveFilePathWithExtensions = (basePath) => {
  const extensions = ['.js', '.ts', '.blits']

  if (fs.existsSync(basePath)) return basePath

  for (const ext of extensions) {
    const pathWithExt = basePath + ext
    if (fs.existsSync(pathWithExt)) return pathWithExt
  }
  return null
}

const _safeGet = (obj, ...paths) => {
  let current = obj
  for (const path of paths) {
    if (current == null) return undefined
    current = current[path]
  }
  return current
}

const _isBlitsComponentDeclaration = (declaration) => {
  return (
    declaration?.type === 'CallExpression' &&
    _safeGet(declaration, 'callee', 'type') === 'MemberExpression' &&
    _safeGet(declaration, 'callee', 'object', 'name') === 'Blits' &&
    ['Component', 'Application'].includes(_safeGet(declaration, 'callee', 'property', 'name'))
  )
}

const _getEmptyAnalysis = () => {
  return {
    imports: [],
    components: {},
    props: [],
    importedComponents: [],
  }
}

module.exports = {
  analyzeComponentsInDocument,
}
