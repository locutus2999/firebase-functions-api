/* ==============================
 endpoint for shopify inventory update requests and fulfillment notifications
================================= */
require('dotenv').config()
const logger = require('logger')
const debug = logger.debug
const { db, rtdb } = require('services')
const fetch = require('node-fetch')
const { GraphQLClient } = require('graphql-request')
const Shopify = require('shopify-api-node')

module.exports.GET = async (req, res) => {
  try {
    if (!res.locals.id) return { status: 400, response: 'Missing Account ID' }
    const accountID = res.locals.id && res.locals.id.replace('/', '')
    const { shop, sku } = req.query

    if (shop && res.locals.update) {
      debug('locals update', res.locals.update)

      if (res.locals.update === 'fetch_stock.json') {
        if (!sku) {
          // get inventory for all skus for account
          const updates = fetch(
            `https://stage.callmss.com/oeaccess/api/?mode=fetch_stock.json&accountID=${accountID}`
          )
            .then(res => res.text())
            .then(body => body)

          return { status: 200, response: await updates }
        }
      }

      return { status: 200, response: {} }
    } else {
      return { status: 400, response: 'Missing parameter.' }
    }
  } catch (error) {
    console.error('shopify/updateReq', error)
    return { status: 500, response: error }
  }
}

module.exports.POST = async function (req, res) {
  try {
    if (!res.locals.id) return { status: 400, response: 'Missing Account ID' }
    const accountID = res.locals.id && res.locals.id.replace('/', '')

    if (res.locals.update) {
      debug('locals update', res.locals.update)
      if (res.locals.update === 'fulfillment_order_notification') {
        /* this simply lets us know there is a new fulfillment request out there.
           Payload, which we are ignoring, is simply { kind: 'FULFILLMENT_REQUEST'
           or 'CANCELLATION_REQUEST'}
        */

        /* acknowledge to shopify that we received the post
        (otherwise they will keep posting every 5 seconds) */
        res.status(200).send('OK')

        // lookup api keys for account
        const getSettingsPayload = {
          accountId: accountID,
          nodeKey: 'settings',
          accountLookupKey: 'shopify'
        }

        const { api: settings, ...allSettings } = await rtdb.getDataByKey(
          getSettingsPayload
        )
        if (!allSettings) {
          console.error('shopify/install settings', accountID)
          return {
            status: 400,
            response: 'Unable to locate app settings for: ' + accountID
          }
        }

        // Query shopify for assigned fulfillments
        const shopifyGraphQLendpoint = `https://${allSettings.shopify_url}/admin/api/2020-07/graphql.json`
        const graphQLClient = new GraphQLClient(shopifyGraphQLendpoint, {
          headers: {
            'X-Shopify-Access-Token': settings.api_accessToken
          }
        })

        const fulfillmentRequests = async () => {
          const query = /* GraphQL */ `
            {
              shop {
                assignedFulfillmentOrders(first: 250) {
                  edges {
                    node {
                      id
                      requestStatus
                      status
                      order {
                        id
                        name
                      }
                    }
                  }
                }
              }
            }
          `
          return await graphQLClient.request(query)
        }

        const fulfillments = await fulfillmentRequests().catch(error =>
          console.error(error)
        )

        const shopify = new Shopify({
          shopName: allSettings.shopify_url,
          accessToken: settings.api_accessToken
        })
        const acceptedFulfillmentRequests = []
        const createdFulfillments = []

        // loop through all fulfillment requests
        for (const fulfillment of fulfillments.shop.assignedFulfillmentOrders
          .edges) {
          debug('fulfillment:', fulfillment.node)
          const orderState =
            fulfillment.node.requestStatus === 'SUBMITTED' &&
            fulfillment.node.status === 'OPEN'
              ? 'REQUESTED'
              : fulfillment.node.requestStatus === 'ACCEPTED' &&
                fulfillment.node.status === 'IN_PROGRESS'
              ? 'PENDING'
              : false

          // get order data from Shopify using the REST API
          // GraphQL includes gid path with order id, use RegEx to extract just the id
          const order = orderState
            ? await shopify.order.get(
                fulfillment.node.order.id.match(/(?!\/)\d+/),
                ''
              )
            : {}

          // lookup order in firestore
          const accountRef = db.collection('accounts').doc(accountID)
          const orderRef = await accountRef
            .collection('orders')
            .doc(accountID + order.id)
          const orderRes = await orderRef.get()

          // import order if order was not found
          const orderData = orderRes.exists
            ? orderRes.data()
            : { ...order, accountId: accountID }

          // update or import order
          const orderImported = orderRes.exists
            ? await orderRef.update(orderData)
            : await orderRef.set(orderData)

          if (
            orderState === 'REQUESTED' &&
            orderData.wms &&
            orderData.wms.confirmid
          ) {
            // accept request
            const acceptFulfillmentRequest = async variables => {
              const query = /* GraphQL */ `
                mutation fulfillmentOrderAcceptFulfillmentRequest(
                  $id: ID!
                  $message: String
                ) {
                  fulfillmentOrderAcceptFulfillmentRequest(
                    id: $id
                    message: $message
                  ) {
                    fulfillmentOrder {
                      id
                      status
                      requestStatus
                    }
                    userErrors {
                      field
                      message
                    }
                  }
                }
              `
              return await graphQLClient.request(query, variables)
            }

            const acceptFulfillmentRequestVars = {
              id: fulfillment.node.id,
              message: `Fulfillment Order Accepted, Confirmation ID: ${orderData.wms.confirmid}`
            }

            // accept fulillment request if order was imported
            const acceptFulfillment = orderData.id
              ? await acceptFulfillmentRequest(
                  acceptFulfillmentRequestVars
                ).catch(error => console.error(error))
              : { error: orderImported }

            debug('accepted fulfillment', acceptFulfillment)
            acceptedFulfillmentRequests.push(acceptFulfillment)
          }

          // if there is shipping info, update order in shopify as fulfilled
          if (
            orderState === 'PENDING' &&
            orderData.wms &&
            (orderData.wms.trackingNumber || orderData.wms.shipmentDate)
          ) {
            const createFulfillment = async variables => {
              // create fulfillment in shopify with tracking info
              const query = /* GraphQL */ `
                mutation fulfillmentCreateV2(
                  $fulfillment: FulfillmentV2Input!
                ) {
                  fulfillmentCreateV2(fulfillment: $fulfillment) {
                    fulfillment {
                      id
                      displayStatus
                      status
                      trackingInfo {
                        number
                      }
                    }
                    userErrors {
                      field
                      message
                    }
                  }
                }
              `
              return await graphQLClient.request(query, variables)
            }

            const createFulfillmentVars = {
              fulfillment: {
                notifyCustomer: true,
                trackingInfo: {
                  number: orderData.wms.trackingNumber || '',
                  company: orderData.wms.carrier || ''
                },
                lineItemsByFulfillmentOrder: [
                  {
                    fulfillmentOrderId: fulfillment.node.id
                  }
                ]
              }
            }

            const createdFulfillment = await createFulfillment(
              createFulfillmentVars
            ).catch(error => console.error(error))
            debug('created fulfillment', createdFulfillment)
            if (createdFulfillment) {
              createdFulfillments.push({
                id: orderData.id,
                orderData: {
                  createdFulfillment,
                  createFulfillmentVars,
                  wms: orderData.wms
                }
              })
            }
          }
        }
        // return without status, status sent in earlier acknowlegement
        return true
      }
    }
    return { status: 200, response: 'OK' }
  } catch (error) {
    console.error('shopify/updateReq', error)
    return { status: 500, response: error }
  }
}
