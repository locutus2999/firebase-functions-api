/* eslint-disable camelcase */

require('dotenv').config()
// const logger = require('logger')
// const debug = logger.debug
const functions = require('firebase-functions')
// const admin = require('firebase-admin')

module.exports = functions.firestore
  .document('accounts/{accountId}/orders/{orderId}')
  .onCreate(async (snap, context) => {
    try {
      // const order = snap.data()
      // define payload to lookup settings in rtdb
      /*       const getSettingsPayload = {
        db: database,
        lookupKey: process.env.GCLOUD_PROJECT,
        nodeKey: 'settings',
        accountId: context.params.accountId
      }
      // lookup the settings
      const settings = await getDataByKey(getSettingsPayload)

      const orderPayload = {
        OrderHeader: {
          CustomerID: context.params.accountId,
          ShipToID: context.params.accountId + '0000',
          ShipToContactFName: order.shipping_address.first_name,
          ShipToContactLName: order.shipping_address.last_name,
          ShipToAddress1: order.shipping_address.address1,
          ShipToAddress2: order.shipping_address.address2,
          ShipToCity: order.shipping_address.city,
          ShipToZip: order.shipping_address.zip,
          ShipToState: order.shipping_address.province_code,
          ShipToCountry: order.shipping_address.country
        },
        OrderDetails: await getOrderDetails(
          order.line_items,
          context.params.accountId,
          settings
        )
      }

      const { URLSearchParams } = require('url')
      const params = new URLSearchParams()
      params.append('username', settings.MIOPA_username)
      params.append('password', settings.MIOPA_password)
      params.append('order', JSON.stringify(orderPayload))

      const miopaResponse = await fetch(settings.MIOPA_url, {
        method: 'POST',
        body: params
      }).then(
        response => {
          if (response.ok) {
            return response.json()
          } else {
            var error = new Error(response.statusText)
            error.response = response
            throw error
          }
        },
        error => console.error(error)
      )
      // handle network error

      if (miopaResponse.error) {
        const errorObj = {
          metaData: '',
          MIOPA_response: miopaResponse,
          MIOPA_Order: orderPayload,
          Shopify_Order: {
            customer: order.customer,
            shipping_address: order.shipping_address,
            items: order.line_tems
          }
        }
        console.error(errorObj)
      } else {
        debug('miopa response', miopaResponse)
      } */
    } catch (error) {
      console.error(error)
    }
  })
