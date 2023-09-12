const traverse = require('@babel/traverse').default

const findTemplateRange = (ast) => {
  let start = 0
  let end = 0
  if (ast) {
    traverse(ast, {
      ObjectProperty(path) {
        if (path.node.key.name === 'template') {
          start = path.node.start
          end = path.node.end
        }
      },
    })

    return { start, end }
  }

  return { start: 0, end: 0 }
}

const findComponentFileByName = (ast, tag) => {
  let file = null
  if (ast) {
    traverse(ast, {
      ImportDeclaration(path) {
        for (const specifier of path.node.specifiers) {
          if (
            specifier.type === 'ImportSpecifier' ||
            specifier.type === 'ImportDefaultSpecifier'
          ) {
            if (specifier.local.name === tag) {
              file = path.node.source.value
              break
            }
          }
        }
      },
    })
  }
  return file
}

const isCursorInsideTemplate = (document, ast, position) => {
  if (ast) {
    const { start, end } = findTemplateRange(ast)
    const cursorOffset = document.offsetAt(position)

    if (cursorOffset >= start && cursorOffset <= end) {
      return true
    }
  }
  return false
}

const getExistingTagAndAttributes = (line) => {
  let result = {
    tagName: null,
    attributes: [],
  }

  if (line.length > 0) {
    const regex = /<(\w+)\s+(.*?)[\s/>]*$/
    const match = regex.exec(line)

    if (match !== null) {
      result.tagName = match[1]
      const attributesString = match[2]

      const attributeRegex =
        /([\w.|data-]+)=["']?((?:.(?!["']?\s+(?:\S+)=|\s*\/?[>"']))+.)["']?/g
      let attributeMatch

      while (
        (attributeMatch = attributeRegex.exec(attributesString)) !== null
      ) {
        result.attributes.push(attributeMatch[1])
      }
    }
  }
  return result
}

module.exports = {
  findTemplateRange,
  isCursorInsideTemplate,
  getExistingTagAndAttributes,
  findComponentFileByName,
}
