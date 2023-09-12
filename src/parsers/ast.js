const parser = require('@babel/parser')

module.exports = (code) => {
  try {
    return parser.parse(code, {
      sourceType: 'module',
    })
  } catch (e) {
    console.error('error parsing AST')
    return null
  }
}
