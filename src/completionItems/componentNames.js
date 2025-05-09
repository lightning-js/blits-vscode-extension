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

function createSeparator(label) {
  const separator = new vscode.CompletionItem(label, vscode.CompletionItemKind.Text)
  separator.sortText = label.startsWith('Built-in') ? '0' : label.startsWith('Custom') ? '1' : '2'
  separator.preselect = false
  // Make it non-insertable
  separator.insertText = ''
  // Add visual distinction
  separator.label = `── ${label} ──`
  // Prevent filtering
  separator.filterText = ''
  // Make it look disabled
  separator.detail = ' '

  return separator
}

const suggest = async (componentData) => {
  let completionItems = []

  completionItems.push(createSeparator('Built-in Components'))

  const element = new vscode.CompletionItem('Element', vscode.CompletionItemKind.Class)
  const elementDocs = new vscode.MarkdownString()
  elementDocs.isTrusted = true // Enable trusted rendering
  elementDocs.appendMarkdown('Core building block of a Blits template that represents a Lightning 3 Renderer node.\n\n')
  elementDocs.appendCodeblock('<Element x="10" y="20" color="#ff0000" />', 'xml')
  elementDocs.appendCodeblock(
    `<Element w="400" h="100" x="800" y="900" color="#0284c7">
  <Element w="42%" h="30%" y="5%" x="1%" color="#075985" />
</Element>\n`,
    'xml'
  )

  element.documentation = elementDocs
  element.sortText = '0-Element'
  element.detail = 'Built-in Component: <Element>'

  completionItems.push(element)

  const layout = new vscode.CompletionItem('Layout', vscode.CompletionItemKind.Class)
  const layoutDocs = new vscode.MarkdownString()
  layoutDocs.isTrusted = true // Enable trusted rendering
  layoutDocs.appendMarkdown(
    'Automatically positions child elements in a horizontal or vertical layout with customizable spacing and alignment.\n\n'
  )
  layoutDocs.appendMarkdown('**Key Features:**\n')
  layoutDocs.appendMarkdown('- Automatic positioning of children\n')
  layoutDocs.appendMarkdown('- Supports horizontal (default) and vertical layouts\n')
  layoutDocs.appendMarkdown('- Configurable spacing between elements\n')
  layoutDocs.appendMarkdown('- Flexible alignment options\n\n')

  layoutDocs.appendMarkdown('**Example Usage:**\n')
  layoutDocs.appendCodeblock(
    `<Layout direction="horizontal" gap="20" align-items="center">
    <Element w="40" h="40" color="red" />
    <Element w="80" h="40" color="blue" />
    <Text>Hello world</Text>
  </Layout>`,
    'xml'
  )

  layoutDocs.appendMarkdown('\n**Attributes:**\n')
  layoutDocs.appendMarkdown('- `direction`: "horizontal" | "vertical"\n')
  layoutDocs.appendMarkdown('- `gap`: spacing between children (in pixels)\n')
  layoutDocs.appendMarkdown('- `align-items`: "start" | "center" | "end"\n')
  layoutDocs.appendMarkdown('\n**Events:**\n')
  layoutDocs.appendMarkdown('- `@updated`: Emitted when layout dimensions change\n')

  layout.documentation = layoutDocs
  layout.sortText = '0-Layout'
  layout.detail = 'Built-in Component: <Layout>'

  completionItems.push(layout)

  // Text Component
  const text = new vscode.CompletionItem('Text', vscode.CompletionItemKind.Class)
  const textDocs = new vscode.MarkdownString()
  textDocs.isTrusted = true // Enable trusted rendering
  textDocs.appendMarkdown('Core built-in component for and styling texts in a simple and intuitive way.\n\n')
  textDocs.appendCodeblock(
    `<Text
  content="Hello world"
  font="ComicSans"
  size="$fontSize"
  :color="$changingColor"
/>\n`,
    'xml'
  )

  text.documentation = textDocs
  text.sortText = '0-Text'
  text.detail = 'Built-in Component: <Text>'

  completionItems.push(text)

  // RouterView Component
  const routerView = new vscode.CompletionItem('RouterView', vscode.CompletionItemKind.Class)
  let routerViewDocs = new vscode.MarkdownString()
  routerViewDocs.isTrusted = true // Enable trusted rendering
  routerViewDocs.appendMarkdown(
    'Acts as a placeholder component that displays the currently active route component. Pages are rendered inside RouterView based on the current route.\n\n'
  )
  routerViewDocs.appendMarkdown('**Features:**\n')
  routerViewDocs.appendMarkdown('- Renders routed page components\n')
  routerViewDocs.appendMarkdown('- Can be positioned and sized like regular components\n')
  routerViewDocs.appendMarkdown('- Supports route transitions\n')

  routerViewDocs.appendMarkdown('\n**Example Usage:**\n')
  routerViewDocs.appendCodeblock(
    `export default Blits.Application({
  template: \`
    <Element>
      <RouterView x="300" y="200" w="1520" h="680" />
    </Element>
  \`,
  routes: [
    { path: '/', component: Home },
    { path: '/details', component: () => import('./pages/Details.js') }
  ]
})`,
    'javascript'
  )

  routerViewDocs.appendMarkdown('\n**Notes:**\n')
  routerViewDocs.appendMarkdown("- Place in your app's main template\n")
  routerViewDocs.appendMarkdown('- Supports regular positioning attributes (x, y, w, h)\n')
  routerViewDocs.appendMarkdown('- Works with both static and dynamic route components\n')

  routerView.documentation = routerViewDocs
  routerView.sortText = '0-RouterView'
  routerView.detail = 'Built-in Component: RouterView'

  completionItems.push(routerView)

  // check custom components
  const registeredComponents = componentData.importedComponents.filter(
    (component) => component.isUsedInComponents === true
  )

  if (registeredComponents.length > 0) {
    completionItems.push(createSeparator('Custom Components'))

    registeredComponents.forEach((comp) => {
      const item = new vscode.CompletionItem(comp.name, vscode.CompletionItemKind.Class)
      if (comp.props.length > 0) {
        let docs = new vscode.MarkdownString()
        docs.isTrusted = true // Enable trusted rendering
        docs.appendMarkdown(`\`${comp.name}\` has the following properties:\n\n`)
        comp.props.forEach((prop) => {
          docs.appendCodeblock(
            `${prop.key}: {
  type: ${prop.cast},
  default: ${prop.default ? prop.default : '-'},
  required: ${prop.required ? 'yes' : 'no'}
}\n`,
            'javascript'
          )
        })

        item.documentation = docs
      }
      item.sortText = `1-${comp.name}`
      item.detail = `Custom component: <${comp.name}>`
      completionItems.push(item)
    })
  }

  return completionItems
}

module.exports = {
  suggest,
}
