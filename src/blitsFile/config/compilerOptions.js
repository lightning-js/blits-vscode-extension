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

// Base compiler options applicable to both JS and TS
const baseCompilerOptions = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.ES2020,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  esModuleInterop: true,
  noEmit: true,
  baseUrl: '.',
  paths: {
    '*': ['node_modules/*'],
  },
  include: ['blits.d.ts', '**/*.ts', '**/*.js', '**/*.blits'],
  allowArbitraryExtensions: true,
  allowNonTsExtensions: true,
}

// JavaScript-specific compiler options
const jsCompilerOptions = {
  ...baseCompilerOptions,
  allowJs: true,
  checkJs: true,
}

// TypeScript-specific compiler options
const tsCompilerOptions = {
  ...baseCompilerOptions,
  noUnusedLocals: true,
  noUnusedParameters: true,
  noImplicitReturns: false,
}

module.exports = { jsCompilerOptions, tsCompilerOptions, baseCompilerOptions }
