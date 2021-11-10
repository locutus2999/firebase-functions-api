/* ==============================
install controller for shopify app
================================= */
const { logger } = require('utils')
const crypto = require('crypto')
const querystring = require('querystring')
const request = require('request-promise')

const app = module.exports
app.account = require('./account')
app.orders = require('./orders')

app.install = async req => {
  if (req.query.state !== req.session.account.state) {
    const response =
      'State validation failed: ' +
      req.session.account.state +
      ' / ' +
      req.query.state

    logger.debug(response)
    delete req.session.account.state
    delete req.session.account.installUrl
    this.account.update(req)
    return {
      status: 403,
      response: response
    }
  }

  return !(await this.hmac(req))
    ? { status: 403, response: 'HMAC validation failed' }
    : await this.getToken(req)
}

app.hmac = async req => {
  const map = Object.assign({}, req.query)
  delete map.signature
  delete map.hmac
  const message = querystring.stringify(map)
  const providedHmac = Buffer.from(req.query.hmac, 'utf-8')
  const generatedHash = Buffer.from(
    crypto
      .createHmac('sha256', req.session.account.api.api_secret)
      .update(message)
      .digest('hex'),
    'utf-8'
  )
  let hashEquals = false
  // timingSafeEqual will prevent any timing attacks. Arguments must be buffers
  try {
    hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac)
    // timingSafeEqual will return an error if the input buffers are not the same length.
  } catch (e) {
    hashEquals = false
  }

  return hashEquals
  // return { status: 403, response: 'HMAC validation failed' }
}
app.getToken = async req => {
  // Exchange temporary code for a permanent access token
  const accessTokenRequestUrl =
    'https://' + req.query.shop + '/admin/oauth/access_token'
  const accessTokenPayload = {
    client_id: req.session.account.api.api_key,
    client_secret: req.session.account.api.api_secret,
    code: req.query.code
  }

  return request
    .post(accessTokenRequestUrl, { json: accessTokenPayload })
    .then(async accessTokenResponse => {
      req.session.account.api.api_accessToken = accessTokenResponse.access_token
      this.account.update(req)

      logger.debug(
        'accessToken granted?',
        !(typeof req.session.account.api.api_accessToken === 'undefined')
      )
      return true
    })
    .catch(error => {
      console.log('install', error)
      return false
    })
}
