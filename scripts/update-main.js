const fs = require('fs')
const path = require('path')

const packagePath = path.join(process.cwd(), 'package.json')
const pkg = require(packagePath)

const MODE = process.argv[2] // 'dev' or 'prod'

if (MODE === 'dev') {
  pkg.main = './src/extension.js'
} else if (MODE === 'prod') {
  pkg.main = './out/main.js'
} else {
  console.error('Please specify mode: dev or prod')
  process.exit(1)
}

fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n')
