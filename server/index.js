const utils = require('utils')
const { logger } = utils
const cors = require('cors')
const compression = require('compression')
const express = require('express')
const slashes = require('remove-trailing-slash')
const responseTime = require('response-time')
const helmet = require('helmet')
const bodyParser = require('body-parser')
const queryParser = require('express-query-int')
const parse = require('url-parse')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const app = express()
app.enable('strict routing')

app.use(responseTime())
app.use(helmet.xssFilter())
app.use(helmet.noSniff())
app.use(helmet.ieNoOpen())
app.use(helmet.hsts())
app.use(helmet.hidePoweredBy())
app.use(helmet.dnsPrefetchControl())
app.use(compression())
app.use(cors({ origin: true }))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(queryParser())
app.use(cookieParser())
app.use(session({ secret: 'mss-api-secret', saveUninitialized: true, resave: true }))

const routes = require('routes')
const router = express.Router({
  caseSensitive: app.get('case sensitive routing'),
  strict: app.get('strict routing')
})

const importRoute = async (req, res, next) => {
  try {
    // shopify redirects with query params encoded, decode.
    const reqUrl = parse(decodeURIComponent(req.url))

    res.locals.update = ''

    const stripFileNames = [
      'fetch_stock.json',
      'fetch_tracking_numbers.json',
      'fulfillment_order_notification'
    ]
    stripFileNames.forEach(fileName => {
      if (utils.path.basename(reqUrl.pathname) === fileName) {
        res.locals.update = fileName
        reqUrl.pathname = reqUrl.pathname.replace(fileName, '')
      }
    })

    logger.debug('Requested route:', req.method, reqUrl.pathname)

    const resLookup = slashes(reqUrl.pathname)
    const requestedRes = routes.find(f => f.res === resLookup)
    logger.debug('resource requested:', resLookup)
    logger.debug('resource matched:', requestedRes)

    if (!requestedRes || !requestedRes.src) {
      const { status, response } = {
        status: 404,
        response: 'Requested Resource Not Found ' + reqUrl.pathname
      }
      res.status(status).send(response)
      return
    }
    logger.debug('res: ', requestedRes.src)
    const methodHandlers = require(requestedRes.src)

    if (!Object.keys(methodHandlers).includes(req.method)) {
      const { status, response } = {
        status: 400,
        response: 'Invalid Request Method: ' + req.method
      }
      res.status(status).send(response)
      return
    }

    try {
      const response = await methodHandlers[req.method](req, res, next)
      if (await response) {
        // logger.reportEvent(response, req, "events");
        if (response.status) res.status(response.status).send(response.response)
        return next()
      } else if (!res.headersSent) {
        const { status, response } = {
          status: 500,
          response: 'No response from: ' + req.method
        }
        res.status(status).send(response)
        return next()
      } else {
        return next()
      }
    } catch (error) {
      console.error('error in response:', req.method, error)
      res.end()
    }
  } catch (error) {
    logger.debug(error)
    logger.reportEvent(error)
    res.status(500)
    return next()
  }
}

routes.forEach(route => {
  router.all(route.res, function (req, res, next) {
    next()
  })
})

router.use(importRoute)
app.use(router)

// list available routes
logger.debug('Ready.')
logger.debug('Available routes:')
logger.debug(
  router.stack
    .filter(r => r.route)
    .map(r =>
      Object.entries(r.route.methods)
        .filter(m => Object.values(m).includes(true))
        .toString()
        .replace(',true', ' ')
        .toUpperCase()
        .concat(r.route.path)
    )
)

module.exports.express = express
module.exports.app = app
module.exports.routes = routes
