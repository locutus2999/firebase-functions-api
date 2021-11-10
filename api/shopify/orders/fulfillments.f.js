/* ====================================
  Shopify Order Fulfillment Webhook
====================================== */

require('dotenv').config()
var util = require('util')
const logger = require('logger')
const debug = logger.debug
const admin = require('firebase-admin')
const db = admin.firestore()
const rtdb = admin.database()

/* const db3 = admin.initializeApp({
  databaseURL: `https://${process.env.GCLOUD_PROJECT}-data.firebaseio.com`
},'db3'); */

const crypto = require('crypto')
const request = require('request-promise')

function getDataByKey ({ entity, path }) {
  try {
    // get data from RTDB
    debug('shopify/install', { entity, path })
    const data = rtdb
      .ref(`${entity}/${path}`)
      .once('value')
      .then(snapshot => {
        return snapshot.val()
      })
      .then(data => {
        return data
      })
    return data
  } catch (error) {
    console.error('shopifyinstall/getDataByKey', error)
    return {}
  }
}

module.exports.GET = async function (req, res) {
  // make sure account id is provided
  if (!res.locals.id) return { status: 400, response: 'Missing Account ID' }
  const accountID = res.locals.id

  // get api keys
  const getSettingsPayload = {
    entity: 'accounts',
    path: `${accountID}/settings/shopify`
  }
  // lookup the settings
  const settings = await getDataByKey(getSettingsPayload)
  if (!settings) {
    console.error('shopify/install settings', accountID)
    return {
      status: 400,
      response: 'Unable to locate app settings for: ' + accountID
    }
  }

  const shop = settings.shopify_url

  const shopRequestUrl =
    'https://' +
    shop +
    '/admin/api/2020-07/assigned_fulfillment_orders.json?assignment_status=fulfillment_requested'
  const shopRequestHeaders = {
    'X-Shopify-Access-Token': settings.api.api_accessToken
  }
  const response = request
    .get(shopRequestUrl, { headers: shopRequestHeaders })
    .then(shopResponse => {
      debug('services:', shopResponse)
      return shopResponse
    })
    .catch(error => {
      debug(error)
    })

  return { status: 200, response: await response }
}

module.exports.POST = async function (req, res) {
  // make sure account and fulfillment id is provided
  if (!res.locals.id) return { status: 400, response: 'Missing Account ID' }

  const accountID = res.locals.id
  const fulfillments = []
  const results = []

  debug('body.id', req.body.id)

  // eslint-disable-next-line no-prototype-builtins
  if (req.body.hasOwnProperty('id')) {
    fulfillments.push(req.body)
  } else {
    req.body.id = crypto.randomBytes(20).toString('hex')
    fulfillments.push(req.body)
  }

  for (const fulfillment of fulfillments) {
    const fulfillmentID = accountID + fulfillment.id

    // add account id to fulfillment
    fulfillment.accountId = accountID
    try {
      // get/create account document
      await db
        .collection('accounts')
        .doc(accountID)
        .set(
          {
            accountID: accountID,
            updated: admin.firestore.FieldValue.serverTimestamp()
          },
          { merge: true }
        )
    } catch (error) {
      console.error('Error getting/updating account: ', util.inspect(error))
      results.push({
        fulfullmentId: fulfillmentID,
        result: 'error',
        message: util.inspect(error)
      })
    }

    try {
      // save fulfillment
      const fulfillmentRef = db.collection('accounts').doc(accountID)
      await fulfillmentRef
        .collection('fulfillments')
        .doc(fulfillmentID)
        .set(fulfillment)
      debug('Accepted fulfullment ID: ', fulfillmentID)
      results.push({
        fulfillmentId: fulfillmentID,
        result: 'success',
        message: 'accepted'
      })
    } catch (error) {
      results.push({
        fulfillmentId: fulfillmentID,
        result: 'error',
        message: util.inspect(error)
      })
      console.error('Error saving fulfillment: ', error)
    }
  }
  return {
    status: 200,
    response: results.length > 1 ? results : results.shift()
  }
}
