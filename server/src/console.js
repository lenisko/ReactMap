const repl = require('repl')
const knexConnection = require('../knexfile')
const models = require('./models/index.js')

const replServer = repl.start({
  prompt: '> ',
})

replServer.context.models = models
replServer.on('close', () => {
  knexConnection.destroy()
})
