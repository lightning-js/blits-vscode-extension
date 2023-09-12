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

module.exports = (ast) => {
  let props = []

  if (ast) {
    // Traverse the AST to find the 'props' array
    ast.program.body.forEach((node) => {
      // export default
      if (node.type === 'ExportDefaultDeclaration') {
        // function arguments
        node.declaration.arguments.forEach((arg) => {
          // second argument as object
          if (arg.type === 'ObjectExpression') {
            // object properties
            arg.properties.forEach((prop) => {
              // props key
              if (prop.key.name === 'props') {
                /*
                  How props can be defined:
  
                  props: ['index', 'img', 'url']
                  props: [{key: 'index'}, 'img', {key: 'url'}]
                  props: [{key: 'imageId', default: '221aac312'}]
                  props: [{key: 'imageId', default: '221aac312', required: true}]
                */

                // if props is array
                if (prop.value.type === 'ArrayExpression') {
                  prop.value.elements.forEach((item) => {
                    if (item.type === 'StringLiteral') {
                      props.push({
                        key: item.value,
                        required: false,
                      })
                    } else if (item.type === 'ObjectExpression') {
                      let prop = {}
                      item.properties.forEach((objectProps) => {
                        const allowedKeys = ['key', 'required', 'default']

                        // fixme: once rules are clear about how to define props,
                        // we can be more strict about parsing props (like not allowing
                        // objects without 'key' property or type checking for values)
                        if (allowedKeys.includes(objectProps.key.name)) {
                          prop[objectProps.key.name] = objectProps.value.value
                        }
                      })

                      if (Object.prototype.hasOwnProperty.call(prop, 'key')) {
                        if (props.required === undefined) {
                          props.required = false
                        }
                        props.push(prop)
                      }
                    }
                  })
                }
              }
            })
          }
        })
      }
    })

    return props
  }
  return []
}
