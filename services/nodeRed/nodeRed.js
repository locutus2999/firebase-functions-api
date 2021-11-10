require('dotenv').config()
const logger = require('logger')
const http = require('http')
const express = require('express')
const responseTime = require('response-time')
const bodyParser = require('body-parser')
const cors = require('cors')
const compression = require('compression')
const reloadFlow = process.env.RELOAD_FLOW === 'true' || false
const redApp = express()
const { config } = require('./admin')
// const config = require(`./${functions.config().env.value}`)

redApp.use(responseTime())
redApp.use(compression())
redApp.use(cors())
redApp.use(bodyParser.json())
redApp.use(bodyParser.urlencoded({ extended: true }))

const RED = require('node-red')
const server = http.createServer(redApp)

const init = (() => {
  logger.debug('initializing node-red')
  const settings = {
    disableEditor: false,
    httpAdminRoot: '/editor',
    httpNodeRoot: '/',
    functionGlobalContext: {},
    credentialSecret: process.env.NODE_RED_SECRET || 'a-secret-key',
    httpRoot: false,
    userDir: process.env.NODE_RED_USER_DIR || '/tmp',
    flowFile: 'node-red/flows.json',
    editorTheme: {
      projects: {
        enabled: false
      }
    },
    storageModule: require('node-red-contrib-storage-google'),
    googleStorageAppname: 'mycoolapp',
    googleStorageBucket: 'something-12345.appspot.com',
    googleProjectId: 'something-12345',
    googleFirebaseReload: true, // optional
    googleDbUrl: 'https://something-12345.firebaseio.com', // optional
    googleCredentials: config
  }

  RED.init(server, settings)
  redApp.use(settings.httpAdminRoot, RED.httpAdmin)
  redApp.use(settings.httpNodeRoot, RED.httpNode)

  return new Promise((resolve, reject) => {
    let deployed
    RED.events.on(
      'runtime-event',
      (deployed = data => {
        if (data.id === 'runtime-deploy') {
          RED.events.removeListener('runtime-event', deployed)
          logger.debug('node-red flows loaded.')
          resolve()
        }
      })
    )
    RED.start()
  })
})()

function red () {
  return init.then(() => {
    logger.debug('node-red processing started')
    return new Promise((resolve, reject) => {
      if (reloadFlow) {
        RED.nodes.loadFlows().then(() => {
          logger.debug('node-red initialized. flows reloaded')
          resolve()
        })
      } else {
        logger.debug('node-red initialized')
        resolve()
      }
    })
  })
}

module.exports = { redApp, red }

/* this goes in index
const functions redApp, red */

// load other https endpoints
/* exports.red = functions.https.onRequest((req, res) => {
  // initialize node-red and pass request
  red().then(() => {
    redApp(req, res)
  })
}) */
