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

const fs = require('fs')
const path = require('path')

// Create lib files directory
const libDir = path.join(__dirname, '..', 'out', 'lib-files')
if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir, { recursive: true })
}

// Get the TypeScript lib directory
const tsLibPath = path.dirname(require.resolve('typescript/lib/typescript.js'))

// List of essential lib files to copy
const libFiles = [
  'lib.es5.d.ts',
  'lib.dom.d.ts',
  'lib.dom.iterable.d.ts',
  'lib.es2015.d.ts',
  'lib.es2015.collection.d.ts',
  'lib.es2015.core.d.ts',
  'lib.es2015.generator.d.ts',
  'lib.es2015.iterable.d.ts',
  'lib.es2015.promise.d.ts',
  'lib.es2015.proxy.d.ts',
  'lib.es2015.reflect.d.ts',
  'lib.es2015.symbol.d.ts',
  'lib.es2015.symbol.wellknown.d.ts',
  'lib.es2016.d.ts',
  'lib.es2016.array.include.d.ts',
  'lib.es2017.d.ts',
  'lib.es2017.object.d.ts',
  'lib.es2017.sharedmemory.d.ts',
  'lib.es2017.string.d.ts',
  'lib.es2017.intl.d.ts',
  'lib.es2017.typedarrays.d.ts',
  'lib.es2018.d.ts',
  'lib.es2018.asyncgenerator.d.ts',
  'lib.es2018.asynciterable.d.ts',
  'lib.es2018.intl.d.ts',
  'lib.es2018.promise.d.ts',
  'lib.es2018.regexp.d.ts',
  'lib.es2019.d.ts',
  'lib.es2019.array.d.ts',
  'lib.es2019.object.d.ts',
  'lib.es2019.string.d.ts',
  'lib.es2019.symbol.d.ts',
  'lib.es2020.d.ts',
  'lib.es2020.bigint.d.ts',
  'lib.es2020.promise.d.ts',
  'lib.es2020.sharedmemory.d.ts',
  'lib.es2020.string.d.ts',
  'lib.es2020.symbol.wellknown.d.ts',
  'lib.es2020.intl.d.ts',
  'lib.scripthost.d.ts',
  'lib.webworker.importscripts.d.ts',
]

// Copy each lib file
let copiedFiles = 0
let errors = 0

libFiles.forEach((file) => {
  const sourcePath = path.join(tsLibPath, file)
  const destPath = path.join(libDir, file)

  try {
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath)
      copiedFiles++
    } else {
      console.warn(`File not found: ${sourcePath}`)
    }
  } catch (error) {
    console.error(`Error copying ${file}: ${error.message}`)
    errors++
  }
})

console.log(`Build complete! Copied ${copiedFiles} lib files with ${errors} errors.`)
