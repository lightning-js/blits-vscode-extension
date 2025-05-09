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
    rawTypeName: null, // Store the detailed TypeScript type information
  }

  // Extract default value from the property value
  if (valueNode) {
    // Handle TypeScript type assertions (using 'as' keyword)
    if (valueNode.type === 'TSAsExpression') {
      // Extract the default value from the expression
      const expression = valueNode.expression
      if (expression.type === 'StringLiteral') {
        prop.default = expression.value
      } else if (expression.type === 'NumericLiteral') {
        prop.default = expression.value
      } else if (expression.type === 'BooleanLiteral') {
        prop.default = expression.value
      } else if (expression.type === 'NullLiteral') {
        prop.default = null
      } else if (expression.type === 'Identifier' && expression.name === 'undefined') {
        prop.default = null
      }

      // Extract the raw TypeScript type as a string
      prop.rawTypeName = _getTypeStringFromTSNode(valueNode.typeAnnotation)

      // Special handling for type references (especially for enum types)
      if (valueNode.typeAnnotation && valueNode.typeAnnotation.type === 'TSTypeReference') {
        const typeName = _safeGet(valueNode.typeAnnotation, 'typeName', 'name')
        if (typeName && /^[A-Z][a-zA-Z0-9]*$/.test(typeName)) {
          // This is a custom type (like an enum), use its name directly
          prop.cast = typeName
        } else {
          // Otherwise map the type to a standard cast
          prop.cast = _mapTypeToStandardCast(prop.rawTypeName)
        }
      } else {
        // Map the type to a standard cast type for compatibility
        prop.cast = _mapTypeToStandardCast(prop.rawTypeName)
      }
    }
    // Handle standard property value types (non-TypeScript)
    else if (valueNode.type === 'StringLiteral') {
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

  // Parse TypeScript type annotations directly in the property definition
  if (property.typeAnnotation) {
    prop.rawTypeName = _getTypeStringFromTSNode(property.typeAnnotation.typeAnnotation)
    prop.cast = _mapTypeToStandardCast(prop.rawTypeName)
  }

  // Parse JSDoc comments if available
  if (property.leadingComments) {
    const { type, defaultValue } = _parseJSDocComment(property.leadingComments)

    // Use JSDoc type if available and no TypeScript type was found
    if (type) {
      if (!prop.rawTypeName) {
        prop.rawTypeName = type
      }
      if (prop.cast === 'String') {
        prop.cast = _mapTypeToStandardCast(type)
      }
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

  // Determine if the prop is required
  prop.required =
    prop.default === null &&
    ((valueNode.type === 'Identifier' && valueNode.name === 'undefined') ||
      (valueNode.type === 'TSAsExpression' &&
        valueNode.expression.type === 'Identifier' &&
        valueNode.expression.name === 'undefined'))

  return prop
}

// Map TypeScript types to standardized cast types while preserving the original type
const _mapTypeToStandardCast = (typeString) => {
  if (!typeString) return 'String'

  const lowerType = typeString.toLowerCase()

  if (lowerType === 'string' || lowerType.includes('string')) return 'String'
  if (lowerType === 'number' || lowerType.includes('number')) return 'Number'
  if (lowerType === 'boolean' || lowerType.includes('boolean')) return 'Boolean'
  if (lowerType.includes('[]') || lowerType.includes('array')) return 'Array'
  if (lowerType === 'function' || lowerType.includes('=>')) return 'Function'
  if (lowerType === 'any') return 'Any'
  if (lowerType === 'unknown') return 'Unknown'
  if (lowerType === 'never') return 'Never'

  // For custom types (like enums, interfaces, etc.), use the type name itself
  // This handles cases like "Direction", "User", etc.
  if (/^[A-Z][a-zA-Z0-9]*$/.test(typeString)) {
    return typeString // Use the type name directly for PascalCase types
  }

  // For union types that contain a custom type reference
  if (typeString.includes('|')) {
    const parts = typeString.split('|').map((part) => part.trim())
    for (const part of parts) {
      // If any part is a custom type (starts with capital letter), use it
      if (/^[A-Z][a-zA-Z0-9]*$/.test(part)) {
        return part
      }
    }
  }

  // Default to Object for other complex types
  return 'Object'
}

// Extract raw type string from TypeScript type nodes
const _getTypeStringFromTSNode = (typeNode) => {
  if (!typeNode) return null // No type specified

  try {
    switch (typeNode.type) {
      case 'TSStringKeyword':
        return 'string'

      case 'TSNumberKeyword':
        return 'number'

      case 'TSBooleanKeyword':
        return 'boolean'

      case 'TSObjectKeyword':
        return 'object'

      case 'TSArrayType':
        // Format: elementType[]
        return `${_getTypeStringFromTSNode(typeNode.elementType)}[]`

      case 'TSFunctionType':
        return 'function'

      case 'TSLiteralType':
        // Literal types like 'red', 42, etc.
        return _getLiteralTypeString(typeNode.literal)

      case 'TSTypeReference':
        // Type references like MyType, Array<string>, etc.
        return _getTypeReferenceString(typeNode)

      case 'TSUnionType':
        // Union types like string | number
        return _getUnionTypeString(typeNode)

      case 'TSIntersectionType':
        // Intersection types like Type1 & Type2
        return typeNode.types.map((type) => _getTypeStringFromTSNode(type)).join(' & ')

      case 'TSAnyKeyword':
        return 'any'

      case 'TSUnknownKeyword':
        return 'unknown'

      case 'TSNeverKeyword':
        return 'never'

      case 'TSNullKeyword':
        return 'null'

      case 'TSUndefinedKeyword':
        return 'undefined'

      case 'TSVoidKeyword':
        return 'void'

      case 'TSTypeLiteral':
        // Complex object type like { prop1: string, prop2: number }
        // Simplified to avoid deep recursion
        return 'object'

      default:
        console.warn(`Unhandled TypeScript type node: ${typeNode.type}`)
        return null // No type could be determined
    }
  } catch (e) {
    console.error('Error extracting type from TypeScript node:', e)
    return null // Error occurred while processing type
  }
}

// Helper function to get string representation of literal types
const _getLiteralTypeString = (literalNode) => {
  if (!literalNode) return 'unknown'

  switch (literalNode.type) {
    case 'StringLiteral':
      return `'${literalNode.value}'` // Quote string literals

    case 'NumericLiteral':
      return literalNode.value.toString()

    case 'BooleanLiteral':
      return literalNode.value.toString()

    default:
      return 'unknown'
  }
}

// Helper function to get string representation of type references
const _getTypeReferenceString = (typeReferenceNode) => {
  if (!typeReferenceNode || !typeReferenceNode.typeName) return 'object'

  const typeName = _safeGet(typeReferenceNode, 'typeName', 'name')

  // Handle generic types like Array<string>
  if (typeReferenceNode.typeParameters && typeReferenceNode.typeParameters.params.length > 0) {
    const typeArgs = typeReferenceNode.typeParameters.params.map((param) => _getTypeStringFromTSNode(param)).join(', ')

    return `${typeName}<${typeArgs}>`
  }

  // For simple type references, return the exact type name
  return typeName
}

// Helper function to get string representation of union types
const _getUnionTypeString = (unionTypeNode) => {
  if (!unionTypeNode || !unionTypeNode.types || !unionTypeNode.types.length) {
    return 'unknown'
  }

  return unionTypeNode.types.map((type) => _getTypeStringFromTSNode(type)).join(' | ')
}

const _extractTypeFromTSNode = (typeNode) => {
  if (!typeNode) return 'String' // Default type if no type information is available

  try {
    switch (typeNode.type) {
      case 'TSStringKeyword':
        return 'String'

      case 'TSNumberKeyword':
        return 'Number'

      case 'TSBooleanKeyword':
        return 'Boolean'

      case 'TSObjectKeyword':
        return 'Object'

      case 'TSArrayType':
        return 'Array'

      case 'TSFunctionType':
        return 'Function'

      case 'TSLiteralType':
        // Handle literal types (e.g., 'red' as const, 42 as const)
        return _getLiteralTypecast(typeNode.literal)

      case 'TSTypeReference':
        // Handle type references (e.g., MyType, Array<string>)
        return _getTypeReferenceTypecast(typeNode)

      case 'TSUnionType':
        // Handle union types (e.g., string | number)
        return _getUnionTypecast(typeNode)

      case 'TSIntersectionType':
        // Handle intersection types (e.g., Type1 & Type2)
        return 'Object' // Simplify intersection types to Object

      case 'TSAnyKeyword':
        return 'Any'

      case 'TSUnknownKeyword':
        return 'Unknown'

      case 'TSNeverKeyword':
        return 'Never'

      case 'TSNullKeyword':
        return 'Null'

      case 'TSUndefinedKeyword':
        return 'Undefined'

      case 'TSTypeLiteral':
        // Handle object type literals ({prop: string})
        return 'Object'

      default:
        console.warn(`Unhandled TypeScript type node: ${typeNode.type}`)
        return 'String' // Default to String for unhandled types
    }
  } catch (e) {
    console.error('Error extracting type from TypeScript node:', e)
    return 'String' // Default to String on error
  }
}

// Helper function to determine the typecast from a literal type
const _getLiteralTypecast = (literalNode) => {
  if (!literalNode) return 'String'

  switch (literalNode.type) {
    case 'StringLiteral':
      return 'String'

    case 'NumericLiteral':
      return 'Number'

    case 'BooleanLiteral':
      return 'Boolean'

    default:
      return 'String'
  }
}

// Helper function to determine the typecast from a type reference
const _getTypeReferenceTypecast = (typeReferenceNode) => {
  if (!typeReferenceNode || !typeReferenceNode.typeName) return 'Object'

  const typeName = _safeGet(typeReferenceNode, 'typeName', 'name')

  // Handle built-in type references
  const typeMap = {
    String: 'String',
    Number: 'Number',
    Boolean: 'Boolean',
    Object: 'Object',
    Array: 'Array',
    Function: 'Function',
    Date: 'Date',
    RegExp: 'Object',
    Promise: 'Object',
    Map: 'Object',
    Set: 'Object',
  }

  // Check if it's a generic Array type
  if (typeName === 'Array' && typeReferenceNode.typeParameters && typeReferenceNode.typeParameters.params.length > 0) {
    return 'Array'
  }

  return typeMap[typeName] || 'Object' // Default to Object for custom types
}

// Helper function to determine the typecast from a union type
const _getUnionTypecast = (unionTypeNode) => {
  if (!unionTypeNode || !unionTypeNode.types || !unionTypeNode.types.length) {
    return 'String'
  }

  // Check if the union is just between null/undefined and another type
  const nonNullableTypes = unionTypeNode.types.filter(
    (type) => type.type !== 'TSNullKeyword' && type.type !== 'TSUndefinedKeyword'
  )

  if (nonNullableTypes.length === 1) {
    // Just one non-nullable type, use that
    return _extractTypeFromTSNode(nonNullableTypes[0])
  }

  // For mixed type unions, prioritize some types over others
  const typeChecks = [
    // Check if all types are string
    { type: 'TSStringKeyword', result: 'String' },
    // Check if all types are number
    { type: 'TSNumberKeyword', result: 'Number' },
    // Check if all types are boolean
    { type: 'TSBooleanKeyword', result: 'Boolean' },
  ]

  for (const check of typeChecks) {
    if (nonNullableTypes.every((type) => type.type === check.type)) {
      return check.result
    }
  }

  // Check for unions of string literals (like enums)
  if (nonNullableTypes.every((type) => type.type === 'TSLiteralType' && type.literal.type === 'StringLiteral')) {
    return 'String'
  }

  // Check for unions of number literals
  if (nonNullableTypes.every((type) => type.type === 'TSLiteralType' && type.literal.type === 'NumericLiteral')) {
    return 'Number'
  }

  // For mixed types, default to String
  return 'String'
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
