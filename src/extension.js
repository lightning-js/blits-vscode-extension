const completionProviders = require('./completionProviders')

function activate(context) {
  // add completion provider for template section
  context.subscriptions.push(completionProviders.templateAttributes)

  console.log('bolt-template-highlighter has been activated.')
}

function deactivate() {
  console.log('bolt-template-highlighter has been deactivated.')
}

module.exports = {
  activate,
  deactivate,
}
