/* ==============================
 entry point for shopify app
================================= */
require('dotenv').config()
const { logger, ...utils } = require('utils')
const nonce = require('nonce')()
const shopify = require('controllers/shopify')

module.exports.GET = async (req, res) => {
  try {
    if (req.query.shop && abc) {
      // get account shopify api credentials and settings
      const account = await shopify.account.get(req)

      if (!account || account.status) {
        return {
          status: account.status || 400,
          response:
            account.response ||
            'Unable to locate account for: ' + req.query.shop
        }
      }

      if (!req.query.state || !account.state) {
        account.state = account.state || nonce()
        account.redirectUri = 'https://' + req.hostname + req.baseUrl + req.path
        account.installUrl = utils.placeholders(account.installUrl, account)

        const accountUpdated = await shopify.account.update(req, account)
        // redirect to shopify for authentication
        return res.status(201).redirect(301, accountUpdated.installUrl)
      } else {
        logger.debug('installing app')
        // create app instance
        const app = await shopify.install(req)
        logger.debug('install complete', app)

        if (app) {
          // app installed, show dashboard
          return {
            status: 200,
            response:
              '<link rel="stylesheet" href="https://unpkg.com/@shopify/polaris@5.0.0-alpha.3/dist/styles.css"/><p style="font-size: 1.1em; padding: 2em;line-height: 1.75em;">Status: <strong>Connected</strong><br/>' +
              `Orders Waiting: <strong>XXX</strong><br/><br/><button onclick="location.assign(location.pathname + location.search.replace(/[?&]hmac=[^&]+/, '').replace(/^&/, '?') + location.hash);">Refresh</button>`
          }
        } else {
          return {
            status: 400,
            response: 'App install error.'
          }
        }
      }
    } else {
      return {
        status: 400,
        response: `Missing shop parameter.
        Add ?shop=yourstore.myshopify.com to your request, or contact MSS Support`
      }
    }
  } catch (error) {
    // console.error(__filename, error)
    logger.reportEvent(error, req)

    return { status: 500, response: error }
  }
}
