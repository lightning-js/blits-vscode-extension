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

const PATTERNS = {
  TAG_START: /^<\/?([a-zA-Z0-9_\-.]+)\s*/,
  TAG_END: /^\s*(\/?>)/,
  ATTR_NAME: /^([A-Za-z0-9:.\-_@]+)/,
  ATTR_EQUALS: /^\s*=/,
  ATTR_QUOTE: /^\s*(["'])/,
  EMPTY_TAG_START: /^<>/,
  EMPTY_TAG_END: /^\s*(<\/>)/,
  COMMENT: /^<!--[\s\S]*?-->/,
  WHITESPACE: /^\s+/,
}

function parseTemplate(template = '') {
  let cursor = 0
  let prevCursor = 0
  let currentTag = null
  let currentNode = null
  let currentLevel = 0
  const tree = {}
  const tagStack = []
  let rootTagAdded = false
  let nodeCounter = 0
  let response = {
    status: true,
    error: null,
    tree: null,
  }

  function moveCursorOnMatch(regex) {
    const match = template.slice(cursor).match(regex)
    if (match) {
      prevCursor = cursor
      cursor += match[0].length
    }
    return match
  }

  function parseLoop(next) {
    if (cursor >= template.length || !response.status) {
      return response
    }
    // Process whitespace/comments first
    parseCommentsAndWhiteSpace()
    next()
  }

  function addNode({
    tag,
    start = prevCursor,
    end = cursor,
    type,
    level = currentLevel,
    nodeText,
    tagType = 'opening',
    partial = false,
    isClosed = false,
    openingNode = null,
    closingNode = null,
    attrs = [],
    content = '',
    tokens = [],
  }) {
    nodeCounter++

    tag = String(tag)
      .replace(/[</>]+/g, '')
      .trim()

    if (tagType === 'self-closing') {
      openingNode = nodeCounter
      closingNode = nodeCounter
    }

    if (tagType === 'opening') {
      openingNode = nodeCounter
    }

    if (type === 'tag' && tagType === 'opening') {
      tagStack.push(nodeCounter)
    }

    if (level === 0 && (tagType === 'opening' || tagType === 'self-closing') && type === 'tag') {
      if (rootTagAdded) {
        // We've already encountered a root tag, so this is a second one
        return processError({
          type: 'MultipleRootElements',
          message: 'Templates must have exactly one root element.',
          ranges: [{ start: start, end: end }],
        })
      }
      rootTagAdded = true
    }

    if (tagType === 'closing') {
      if (tagStack.length === 0) {
        return handleUnmatchedClosingTag()
      }

      const lastTag = tagStack[tagStack.length - 1]
      if (tag !== tree[lastTag].tag || level !== tree[lastTag].level) {
        return handleMismatchedTagPair(lastTag, tag)
      }

      tagStack.pop()
      openingNode = lastTag
      closingNode = nodeCounter
      tree[lastTag].closingNode = nodeCounter
      tree[lastTag].isClosed = true
    }

    tree[nodeCounter] = {
      tag,
      start,
      end,
      type,
      level,
      tagType,
      isClosed,
      openingNode,
      closingNode,
      nodeText,
      partial,
      tokens,
      attrs,
      content,
    }
    return nodeCounter
  }

  function parseCommentsAndWhiteSpace() {
    parseWhitespace()
    parseComments()
    parseWhitespace() // Check for whitespace after comments
  }

  function parseWhitespace() {
    const whitespaceMatch = moveCursorOnMatch(PATTERNS.WHITESPACE)
    if (whitespaceMatch) {
      addNode({
        tag: '-',
        type: 'whitespace',
        nodeText: whitespaceMatch[0],
        tagType: null,
        isClosed: true,
        tokens: [
          {
            type: 'whitespace',
            value: whitespaceMatch[0],
            start: prevCursor,
            end: cursor,
          },
        ],
      })
    }
  }

  function parseComments() {
    const match = moveCursorOnMatch(PATTERNS.COMMENT)
    if (match) {
      addNode({
        tag: '+',
        type: 'comment',
        nodeText: match[0],
        tagType: 'self-closing',
        isClosed: true,
        tokens: [
          {
            type: 'comment',
            value: match[0],
            start: prevCursor,
            end: cursor,
          },
        ],
      })
      parseCommentsAndWhiteSpace()
    }
  }

  function parseEmptyTagStart() {
    const match = moveCursorOnMatch(PATTERNS.EMPTY_TAG_START)
    if (match) {
      addNode({
        tag: 'empty',
        type: 'tag',
        nodeText: match[0],
        tokens: [
          {
            type: 'openEmptyTag',
            value: match[0],
            start: prevCursor,
            end: cursor,
          },
        ],
      })
      currentLevel++
      parseLoop(parseEmptyTagStart)
    } else {
      parseLoop(parseEmptyTagEnd)
    }
  }

  function parseEmptyTagEnd() {
    const match = moveCursorOnMatch(PATTERNS.EMPTY_TAG_END)
    if (match) {
      currentLevel--
      addNode({
        tag: 'empty',
        type: 'tag',
        level: currentLevel,
        nodeText: match[0],
        tagType: 'closing',
        tokens: [
          {
            type: 'closeEmptyTag',
            value: match[0],
            start: prevCursor,
            end: cursor,
          },
        ],
      })
      parseLoop(parseEmptyTagStart)
    } else {
      parseLoop(parseTag)
    }
  }

  function parseTag() {
    const match = moveCursorOnMatch(PATTERNS.TAG_START)
    if (match) {
      currentTag = {
        level: currentLevel,
        type: 'opening',
      }
      let level = currentLevel
      if (match[0].startsWith('</')) {
        currentLevel--
        level--
        currentTag.type = 'closing'
        currentTag.level = currentLevel
      } else {
        currentTag.type = 'opening'
        currentLevel++
      }
      currentNode = addNode({
        tag: String(match[1]),
        type: 'tag',
        level,
        nodeText: match[0],
        tagType: currentTag.type,
        partial: true,
        tokens: [
          {
            type: 'tagStart',
            value: match[0],
            start: prevCursor,
            end: cursor,
          },
        ],
      })
      parseLoop(parseTagEnd)
    } else {
      return processError({
        type: 'InvalidTag',
        message: 'This tag is not valid according to Blits syntax.',
        ranges: [{ start: prevCursor, end: cursor }],
      })
    }
  }

  function parseTagEnd() {
    const match = moveCursorOnMatch(PATTERNS.TAG_END)
    if (match) {
      handleTagEnd(match)
      parseLoop(parseEmptyTagStart)
    } else {
      parseLoop(parseAttributes)
    }
  }

  function handleTagEnd(match) {
    if (match[1] === '/>') {
      handleSelfClosingTag()
    }
    updateCurrentNode(match)
    if (currentTag.type === 'opening') {
      handleTagContent()
    }
  }

  function handleSelfClosingTag() {
    if (currentTag.type === 'closing') {
      // For InvalidClosingTag, highlight from the start of the current node.
      return processError({
        type: 'InvalidClosingTag',
        message: 'Closing tags cannot be self-closing. Remove the "/" at the end.',
        ranges: [{ start: tree[currentNode].start, end: cursor }],
      })
    }
    currentTag.type = 'self-closing'
    tree[currentNode].tagType = 'self-closing'
    tree[currentNode].closingNode = currentNode
    tree[currentNode].isClosed = true
    tagStack.pop()
    currentLevel--
  }

  function updateCurrentNode(match) {
    tree[currentNode].nodeText += match[0]
    tree[currentNode].end = cursor
    tree[currentNode].partial = false
    tree[currentNode].tokens.push({
      type: 'tagEnd',
      value: match[0],
      start: prevCursor,
      end: cursor,
    })
  }

  function handleTagContent() {
    const nextTagIndex = template.indexOf('<', cursor)
    const tagContent = nextTagIndex !== -1 ? template.slice(cursor, nextTagIndex) : template.slice(cursor)
    if (tagContent) {
      const tagContentTrimmed = tagContent.trim()
      prevCursor = cursor
      cursor += tagContent.length
      if (tagContentTrimmed.length > 0) {
        currentTag.content = tagContentTrimmed
        tree[currentNode].content = {
          start: prevCursor,
          end: cursor,
          level: currentTag.level,
          node: tagContentTrimmed,
        }
        tree[currentNode].tokens.push({
          type: 'tagContent',
          value: tagContent,
          start: prevCursor,
          end: cursor,
        })
      }
    }
  }

  function parseAttributes() {
    const attrNameMatch = moveCursorOnMatch(PATTERNS.ATTR_NAME)

    if (attrNameMatch) {
      if (currentTag.type === 'closing') {
        // In a closing tag, gather all attribute ranges safely for error reporting
        const attrRanges = [{ start: prevCursor, end: cursor }]

        let nextAttr = moveCursorOnMatch(PATTERNS.ATTR_NAME)
        while (nextAttr) {
          attrRanges.push({ start: prevCursor, end: cursor })
          nextAttr = moveCursorOnMatch(PATTERNS.ATTR_NAME)
        }

        return processError({
          type: 'AttributesInClosingTag',
          message: 'Closing tags cannot have attributes. Remove the attributes from the closing tag.',
          ranges: attrRanges,
        })
      }

      // Check for whitespace before attributes (only for 2nd+ attributes)
      const tokens = tree[currentNode].tokens || []
      const attributeCount = tokens.filter((token) => token.type === 'attributeName').length

      // If this isn't the first attribute, the last token should be whitespace
      if (attributeCount > 0 && tokens[tokens.length - 1].type !== 'whitespace') {
        return processError({
          type: 'MissingWhitespace',
          message: 'Attributes must be separated by whitespace.',
          ranges: [{ start: prevCursor, end: cursor }],
        })
      }

      let attribute = {
        name: { text: attrNameMatch[1], start: prevCursor, end: cursor },
      }

      tree[currentNode].tokens.push({
        type: 'attributeName',
        value: attrNameMatch[0],
        start: prevCursor,
        end: cursor,
      })

      // Check for redundant attributes
      const attrName = attrNameMatch[1]
      const existingAttr = tree[currentNode].attrs.find((attr) => attr.name.text === attrName)
      if (existingAttr) {
        return processError({
          type: 'RedundantAttribute',
          message: `Attribute "${attrName}" is already defined on this element.`,
          ranges: [
            { start: existingAttr.name.start, end: existingAttr.value.end }, // First occurrence
            { start: prevCursor, end: cursor }, // Current occurrence
          ],
        })
      }

      const equalsMatch = moveCursorOnMatch(PATTERNS.ATTR_EQUALS)

      if (!equalsMatch) {
        // No equals sign - attribute needs a value
        return processError({
          type: 'MissingAttributeValue',
          message: 'Attribute must have a value. Add ="value" or remove the attribute.',
          ranges: [{ start: attribute.name.start, end: cursor + 3 }], // +3 chars for visibility
        })
      }

      // Update tokens with equals sign
      tree[currentNode].tokens.push({
        type: 'attributeEquals',
        value: equalsMatch[0],
        start: prevCursor,
        end: cursor,
      })

      const quoteMatch = moveCursorOnMatch(PATTERNS.ATTR_QUOTE)

      if (!quoteMatch) {
        // No opening quote - invalid attribute format
        return processError({
          type: 'MissingAttributeValue',
          message: 'Attribute must have a value. Add ="value" or remove the attribute.',
          ranges: [{ start: attribute.name.start, end: cursor + 3 }], // +3 chars for visibility
        })
      }

      const quoteChar = quoteMatch[1]

      const valueRegex = new RegExp(`^(.*?)${quoteChar}(\\s*)`, 's')
      const valueMatch = moveCursorOnMatch(valueRegex)

      if (!valueMatch) {
        // No closing quote - unclosed attribute value
        return processError({
          type: 'UnclosedAttributeValue',
          message: 'Attribute value is not properly closed. Add a matching closing quote.',
          ranges: [{ start: attribute.name.start, end: cursor + 5 }], // +5 chars for visibility
        })
      }

      attribute.value = {
        text: valueMatch[1],
        start: prevCursor,
        end: cursor - (valueMatch[2] ? valueMatch[2].length : 0),
      }

      tree[currentNode].end = cursor
      tree[currentNode].nodeText += attrNameMatch[0] + equalsMatch[0] + quoteMatch[0] + valueMatch[0]
      tree[currentNode].attrs.push(attribute)

      // Add the value token (excluding trailing whitespace)
      const valueEnd = cursor - (valueMatch[2] ? valueMatch[2].length : 0)
      tree[currentNode].tokens.push({
        type: 'attributeValue',
        value: valueMatch[1] + quoteChar, // Include the closing quote but not trailing whitespace
        start: prevCursor,
        end: valueEnd,
      })

      // Add the trailing whitespace as a separate token if present
      if (valueMatch[2] && valueMatch[2].length > 0) {
        tree[currentNode].tokens.push({
          type: 'whitespace',
          value: valueMatch[2],
          start: valueEnd,
          end: cursor,
        })
      }

      parseLoop(parseTagEnd)
    } else {
      // No valid attribute name found, try to see if there's something that might be an invalid attribute
      const invalidAttrMatch = template.slice(cursor).match(/^(\S+?)(?=[\s=/>]|$)/)

      if (invalidAttrMatch && invalidAttrMatch[1]) {
        const startPos = cursor
        const endPos = cursor + invalidAttrMatch[1].length
        prevCursor = cursor
        cursor += invalidAttrMatch[0].length

        return processError({
          type: 'InvalidAttribute',
          message:
            'Invalid attribute name. Attribute names must contain only letters, numbers, and these special characters: : . - _ @',
          ranges: [{ start: startPos, end: endPos }],
        })
      }

      parseLoop(parseTagEnd)
    }
  }

  function processError(err) {
    response.status = false
    response.error = {
      type: err.type,
      info: err.message,
      ranges: err.ranges || [
        { start: err.start !== undefined ? err.start : prevCursor, end: err.end !== undefined ? err.end : cursor },
      ],
    }
  }

  // Error Handlers
  function handleUnmatchedClosingTag() {
    return processError({
      type: 'UnmatchedClosingTag',
      message: 'No matching opening tag found for this closing tag.',
      ranges: [{ start: prevCursor, end: cursor }],
    })
  }

  function handleMismatchedTagPair(openingNodeIndex, closingTag) {
    let openingTagNode = tree[openingNodeIndex]
    return processError({
      type: 'MismatchedTagPair',
      message: `Expected closing tag for <${openingTagNode.tag}> but found </${closingTag}>. Tags must be properly nested.`,
      ranges: [
        { start: openingTagNode.start, end: openingTagNode.end },
        { start: prevCursor, end: cursor },
      ],
    })
  }

  // Start parsing and return result
  parseLoop(parseEmptyTagStart)
  // response.tree = tree
  // console.log(tree)
  return response
}

module.exports = parseTemplate
