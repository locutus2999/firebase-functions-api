/** ====================================
  The 'routes/index.js' uses a custom method 'globber' to search directories
  for files ending in .f.js to create trigger functions and https endpoints.
  The paths are use to create trigger function names and https api endpoints.
  For example, firestore database trigger function called "onCreate" in the
  users collection, would be at db/users/onCreate.f.js, which would generate
  a firebase function called dbUsersOnCreate(). https endpoints could be placed
  in an "api" directory, within subdirectories named in the plural version of
  the Object, for example:

  api/orders.f.js -- OR -- api/v1/orders/index.f.js
  becomes /api/orders/{id}

  this should handle GET/POST/PUT/DELETE methods, for example:

  GET api/v1/orders/ retrieves a list of orders
  POST api/v1/orders/ creates a new order or orders
  PUT api/v1/orders/ABC-1234 updates order ABC-1234
  DELETE api/v1/orders/ABC-1234 deletes (or cancels/voids) order ABC-1234

  For non-standard/specific use cases, you could also do something like:
  api/orders/batch_create.f.js, which would become api/orders/batchCreate
====================================== */

require('dotenv').config()
const logger = require('logger')

process.on('uncaughtException', error => {
  logger.debug('uncaughtException', error)
  logger.reportEvent(error)
  process.exit(1)
})

// this allows us to require files relative to the root from anywhere
require('app-module-path').addPath(__dirname)

const { app } = require('server')
const { functions } = require('services').firebase

exports.api = functions.https.onRequest(app)

// load non-http cloud functions
const background = require('background')
background.forEach(func => {
  exports[func.fn] = require(func.src)
})

logger.debug('Functions:', Object.keys(exports))
