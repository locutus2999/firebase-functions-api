/* eslint-disable camelcase */
/* ==============================
 final setup for shopify app installation
================================= */
require('dotenv').config()
const logger = require('logger')
const debug = logger.debug
const admin = require('firebase-admin')
const db = admin.firestore()
const rtdb = admin.database()

/* const db3 = admin.initializeApp({
  databaseURL: `https://${process.env.GCLOUD_PROJECT}-data.firebaseio.com`
},'db3'); */

// MS SQL //CM09$$12';//'sqluser05';

const sql = require('mssql')
const wms = {
  host: process.env.WMS_HOST,
  user: process.env.WMS_USER,
  pw: process.env.WMS_PW
}

const config = {
  server: wms.host,
  user: wms.user,
  password: wms.pw,
  port: 1144,
  parseJSON: true,
  database: 'MSSOrderData',
  connectionTimeout: 300000,
  requestTimeout: 300000,
  pool: {
    idleTimeoutMillis: 300000,
    max: 100
  },
  options: {
    tdsVersion: '7_2',
    encrypt: false,
    enableArithAbort: false,
    rowCollectionOnDone: true
  }
}

const executeStatement = async (stmt, db = config.database) => {
  try {
    config.database = db
    // debug("query sql svr", stmt);
    const pool = await sql.connect(config)
    const result = await pool.request().query(stmt)

    return result.recordset
  } catch (error) {
    console.error('database connection error', stmt, error)
    return error
  }
}

const crypto = require('crypto')
const cookie = require('cookie')
const querystring = require('querystring')
const request = require('request-promise')
const Shopify = require('shopify-api-node')
const moment = require('moment-timezone')

const now = () =>
  moment()
    .tz('America/New_York')
    .format('YYYY-MM-DD hh:mm:ss')

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

function setDataByKey ({ entity, path, data, mode = 'update' }) {
  try {
    if (!data) return false
    // set data in RTDB
    const dataRef = rtdb.ref(`${entity}/${path}`)
    dataRef[mode](data)
    return data
  } catch (error) {
    console.error('setDataByKey/shopify/install', error)
    return false
  }
}

// shopify api request using shopify sdk
async function shopifyReq (shopify, { resource, method, id, payload }) {
  try {
    const result = id
      ? await shopify[resource][method](id, payload)
      : await shopify[resource][method](payload)
    return result
  } catch (error) {
    console.error(
      'shopifyReq/shopify/install:',
      resource,
      method,
      id,
      payload,
      error
    )
    return false
  }
}

module.exports.GET = async function (req, res) {
  // make sure account id is provided
  if (!res.locals.id) return { status: 400, response: 'Missing Account ID' }
  const accountID = res.locals.id

  const { shop, hmac, code, state } = req.query
  const stateCookie = cookie.parse(req.headers.cookie || '').state

  if (stateCookie && state !== stateCookie) {
    return { status: 400, response: 'Request origin cannot be verified' }
  }
  // get api keys
  const getSettingsPayload = {
    entity: 'accounts',
    path: `${accountID}/settings/shopify`
  }
  // lookup the settings
  const allSettings = await getDataByKey(getSettingsPayload)
  if (!allSettings) {
    console.error('shopify/install settings', accountID)
    return {
      status: 400,
      response: 'Unable to locate app settings for: ' + accountID
    }
  }

  debug('all settings:', allSettings)
  // set settings to the api key
  const settings = allSettings.api

  if (shop && hmac && code) {
    // DONE: Validate request is from Shopify
    const map = Object.assign({}, req.query)
    delete map.signature
    delete map.hmac
    const message = querystring.stringify(map)
    const providedHmac = Buffer.from(hmac, 'utf-8')
    const generatedHash = Buffer.from(
      crypto
        .createHmac('sha256', settings.api_secret)
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

    if (!hashEquals) {
      return { status: 400, response: 'HMAC validation failed' }
    }

    // DONE: Exchange temporary code for a permanent access token
    const accessTokenRequestUrl =
      'https://' + shop + '/admin/oauth/access_token'
    const accessTokenPayload = {
      client_id: settings.api_key,
      client_secret: settings.api_secret,
      code
    }

    request
      .post(accessTokenRequestUrl, { json: accessTokenPayload })
      .then(async accessTokenResponse => {
        // const accessToken = accessTokenResponse.access_token;
        settings.api_accessToken = accessTokenResponse.access_token

        // update rtdb api settings with token
        try {
          const setSettingsPayload = {
            entity: 'accounts',
            path: `${accountID}/settings/shopify/api`,
            data: { api_accessToken: settings.api_accessToken }
          }
          setDataByKey(setSettingsPayload)
        } catch (error) {
          console.error('shopify/install/setDataByKeyPayload', error)
          return
        }

        /* const lookup = await db.collection("accounts").doc(accountID).set({"shopify": {
        "accessToken": accessToken,
        "updated": admin.firestore.FieldValue.serverTimestamp()
      }}, {merge: true}); */

        debug(
          'accessToken Saved?',
          !(typeof settings.api_accessToken === 'undefined'),
          settings.api_accessToken
        )
      })
      .catch(error => {
        console.log('install', error)
        return { status: 500, response: error }
      })
  }

  const shopify = new Shopify({
    shopName: shop || allSettings.shopify_url,
    accessToken: settings.api_accessToken
  })

  if (shop) {
    shopify.on('callLimits', limits => debug(limits))

    // this call will list all registered fulfillment services
    const shopRequestUrl =
      'https://' +
      shop +
      '/admin/api/2020-07/fulfillment_services.json?scope=all'
    const shopRequestHeaders = {
      'X-Shopify-Access-Token': settings.api_accessToken
    }
    request
      .get(shopRequestUrl, { headers: shopRequestHeaders })
      .then(shopResponse => {
        debug('services:', shopResponse)
      })
      .catch(error => {
        debug(error)
      })

    // check if fulfillment service is setup, create one if not.
    const precheck = await shopifyReq(shopify, {
      resource: 'fulfillmentService',
      method: 'list'
    }) // "payload" : {"scope": "all"}
    precheck.exists = !!precheck.find(
      x => x.handle === 'marketing-support-services-inc'
    )
    debug('fulfillment service:', precheck)

    const callbackUrl = `${process.env.REDIRECT_URI}/shopify/updateReq/${accountID}`

    const fulfillment = precheck.exists
      ? precheck.find(x => x.handle === 'marketing-support-services-inc')
      : await shopifyReq(shopify, {
          resource: 'fulfillmentService',
          method: 'create',
          payload: {
            name: 'Marketing Support Services, Inc',
            email: accountID + 'support@m-s-s.com',
            callback_url: callbackUrl,
            inventory_management: true,
            tracking_support: true,
            requires_shipping_method: true,
            fulfillment_orders_opt_in: true,
            provider_id: 'MSS',
            format: 'json'
          }
        })

    try {
      const updateFulfillment =
        precheck.exists && allSettings.fulfillment.callback_url !== callbackUrl
          ? await shopify.fulfillmentService.update(fulfillment.id, {
              callback_url: callbackUrl,
              fulfillment_orders_opt_in: true,
              id: fulfillment.id,
              location_id: allSettings.fulfillment.location_id
            })
          : false

      debug('fulfillment service updated:', updateFulfillment)
      if (!precheck.exists || updateFulfillment) {
        // update rtdb shopify settings with url and fulfillment data upon creation or if callback url changed
        fulfillment.callback_url = callbackUrl
        fulfillment.fulfillment_orders_opt_in = true
        const setSettingsPayload = {
          entity: 'accounts',
          path: `${accountID}/settings/shopify`,
          data: {
            fulfillment: fulfillment,
            shopify_url: shop,
            created_at: allSettings.created_at ? allSettings.created_at : now(),
            updated_at: now()
          }
        }
        setDataByKey(setSettingsPayload)
      }
    } catch (error) {
      console.error('shopify/install/setDataByKeyPayload', error)
    }

    // get orders waiting to be fulfilled
    const orders = await shopifyReq(shopify, {
      resource: 'order',
      method: 'list',
      payload: {
        status: 'open',
        fulfillment_status: 'unfulfilled',
        financial_status: 'paid',
        limit: 250
      }
    })

    const accountRef = db.collection('accounts').doc(accountID)

    // func to return wms order id and tracking number
    const findOrder = async obj => {
      const stmtSelect = `SELECT tblOrderMaster.OrderNumber, tblOrderMaster.WebConfirmationNumber,
      vwPBShipments.ShipmentDate, vwPBShipments.Carrier, vwPBShipments.CarrierService,
      vwPBShipments.TrackingNum AS TrackingNumber
      FROM tblOrderMaster LEFT JOIN vwPBShipments on
      vwPBShipments.OrderNumber COLLATE DATABASE_DEFAULT = tblOrderMaster.OrderNumber
      COLLATE DATABASE_DEFAULT`
      const stmtWhere =
        obj.wms && (obj.wms.id || obj.wms.confirmid)
          ? `WHERE tblOrderMaster.OrderNumber = '${obj.wms.id ||
              ''}' OR tblOrderMaster.WebConfirmationNumber = ${parseInt(
              obj.wms.confirmid || -1
            )}`
          : obj.shipping_address
          ? `WHERE tblOrderMaster.CustomerID = '${obj.accountId}'
        AND tblOrderMaster.ShipToContactName LIKE '%${obj.shipping_address.last_name.replace(
          /'/g,
          ''
        )}%'
        AND tblOrderMaster.ShipToContactName LIKE '%${obj.shipping_address.first_name.replace(
          /'/g,
          ''
        )}%'
        AND tblOrderMaster.DateReceived >= '${obj.processed_at.replace(
          /[T](\w).+/g,
          ''
        )}'
        AND DATEDIFF(day, '${obj.processed_at.replace(
          /[T](\w).+/g,
          ''
        )}', tblOrderMaster.DateReceived) < 8`
          : ''

      // debug(stmt_select + ' ' + stmt_where);
      const result = stmtWhere
        ? await executeStatement(stmtSelect + ' ' + stmtWhere)
        : ''
      return result.length === 1
        ? result.shift()
        : result.length > 1
        ? { OrderNumber: 'ambiguous' }
        : ''
    }

    for (const order of orders) {
      try {
        // first, check if we have the order and it's been imported into firestore/WMS
        // see if we have imported the order and have the WMS order id
        const orderRef = await accountRef
          .collection('orders')
          .doc(accountID + order.id)
        const orderRes = await orderRef.get()
        const orderData = orderRes.exists
          ? orderRes.data()
          : { ...order, accountId: accountID }

        // import order if it doesn't exist
        if (!orderRes.exists) {
          debug('saving order', order.id)
          const orderImport = await orderRef.set(orderData)
          debug('order saved:', orderImport)
        }

        const wmsOrderData = await findOrder(orderData)

        if (!wmsOrderData) {
          debug(
            'Order Missing:',
            order.id,
            order.name,
            order.shipping_address.last_name
          )
          // delete order so it will reimport
          // orderRes.exists = false;
          // orderRef.delete();
          // debug("Order Deleted", order.id, order.name, order.shipping_address.last_name);
        }

        if (wmsOrderData && wmsOrderData.OrderNumber !== 'ambiguous') {
          // update order doc with wms data
          if (wmsOrderData.TrackingNumber) {
            debug('WMS data', order.id, wmsOrderData)
          }
          const orderUpdate = await accountRef
            .collection('orders')
            .doc(accountID + order.id)

          orderUpdate.update({
            accountId: accountID,
            'wms.id': wmsOrderData.OrderNumber || '',
            'wms.confirmid': wmsOrderData.WebConfirmationNumber || '',
            'wms.trackingNumber': wmsOrderData.TrackingNumber || '',
            'wms.shipmentDate': wmsOrderData.ShipmentDate || '',
            'wms.carrier': wmsOrderData.Carrier || '',
            'wms.carrierService': wmsOrderData.CarrierService || '',
            'wms.updated': admin.firestore.FieldValue.serverTimestamp()
          })
        }

        if (wmsOrderData && wmsOrderData.OrderNumber === 'ambiguous') {
          // generate some sort of error
          console.error('Ambiguous Order!', order.id)
        }
      } catch (error) {
        console.error('shopify/install order foreach', error)
        // return;
      }
    }

    return {
      status: 200,
      response:
        '<link rel="stylesheet" href="https://unpkg.com/@shopify/polaris@5.0.0-alpha.3/dist/styles.css"/><p style="font-size: 1.1em; padding: 2em;line-height: 1.75em;">Status: <strong>Connected</strong><br/>Last Update: <strong>' +
        moment()
          .tz('America/New_York')
          .format('dddd, MMMM Do YYYY, h:mmA') +
        `</strong><br/>Orders Waiting: <strong>${orders.length}</strong><br/><br/><button onclick="location.assign(location.pathname + location.search.replace(/[?&]hmac=[^&]+/, '').replace(/^&/, '?') + location.hash);">Refresh</button>`
    }
  } else {
    return { status: 400, response: 'Required parameters missing' }
  }
}
