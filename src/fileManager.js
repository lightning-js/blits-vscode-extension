// const templateHelper = require('./helpers/template')
const vscode = require('vscode')
const parse = require('./parsers')
const template = require('./helpers/template')

let data = new Map()
let currentFile = ''
let keyPressTimer
const allowedFileSchemes = ['file', 'untitled']

const updateFiles = (doc, changes) => {}

const updateFileSync = (doc) => {
  // parse file
  const fileExtension = uri.fsPath.split('.').pop()
  const AST = parse.AST(content, fileExtension)
  const templates = template.getTemplates(AST, content)
  const hasTemplate = templates.length > 0

  const fileData = {
    content,
    cursorPosition,
    fileExtension,
    AST,
    hasTemplate,
    templates,
    isActive,
    isParsed: true,
    lastParsed: Date.now(),
  }
  data.set(uri.fsPath, fileData)
  if (isActive) {
    currentFile = uri.fsPath
  }
  console.log(
    'fileData',
    fileData.isActive,
    fileData.isParsed,
    fileData.lastParsed
  )
}

const getFile = (uri) => {
  return data.get(uri.fsPath)
}

const setActiveFile = (uri) => {
  currentFile = uri.fsPath
}

const getActiveFile = () => {
  return data.get(currentFile)
}

const clearFile = (uri) => {
  data.delete(uri.fsPath)
}

const updateFileAsync = (doc, cursorPosition, lastChar) => {
  clearTimeout(keyPressTimer)
  const delay = lastChar === '.' ? 0 : 300 // No delay if last character is a dot
  keyPressTimer = setTimeout(() => {
    updateFileSync(doc, cursorPosition)
  }, delay)
}

const clearAllFiles = () => {
  data.clear()
}

const getCursorPosition = (doc) => {
  const activeEditor = vscode.window.activeTextEditor
  if (activeEditor && activeEditor.document === doc) {
    const position = activeEditor.selection.active
    return position
  }
  return null
}

const init = (context) => {
  data = new Map()

  const openedDocEvent = vscode.workspace.onDidOpenTextDocument((doc) => {
    updateFiles(doc)
  })

  const changedDocEvent = vscode.workspace.onDidChangeTextDocument((event) => {
    updateFiles(event.document, event.contentChanges)
  })

  const savedDocEvent = vscode.workspace.onDidSaveTextDocument((doc) => {
    console.log('savedDocEvent', doc.uri.fsPath)
  })

  const closedDocEvent = vscode.workspace.onDidCloseTextDocument((doc) => {
    console.log('closedDocEvent', doc.uri.fsPath)
    if (allowedFileSchemes.includes(doc.uri.scheme)) {
      clearFile(doc)
    }
  })

  const activeEditorChange = vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      if (editor && allowedFileSchemes.includes(editor.document.uri.scheme)) {
        console.log('activeEditorChange', editor.document.uri.fsPath)
        setActiveFile(editor.document.uri)
      }
    }
  )

  // event subscriptions
  context.subscriptions.push(openedDocEvent)
  context.subscriptions.push(changedDocEvent)
  context.subscriptions.push(savedDocEvent)
  context.subscriptions.push(closedDocEvent)
  context.subscriptions.push(activeEditorChange)

  // get the active editor
  const activeEditor = vscode.window.activeTextEditor
  if (
    activeEditor &&
    allowedFileSchemes.includes(activeEditor.document.uri.scheme)
  ) {
    console.log('initialActiveEditor', activeEditor.document.uri.fsPath)
    setActiveFile(activeEditor.document.uri)
    updateFiles(activeEditor.document)
  }
}

module.exports = {
  updateFileAsync,
  getFile,
  clearFile,
  clearAllFiles,
  updateFileSync,
  init,
  getActiveFile,
}
