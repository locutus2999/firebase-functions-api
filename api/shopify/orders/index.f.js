/* eslint-disable no-prototype-builtins */
/* eslint-disable camelcase */
/* eslint-disable no-undef */
/* ====================================
  Shopify Order Webhooks
====================================== */

require('dotenv').config()
var util = require('util')
const debug = require('debug')('verbose')
// eslint-disable-next-line no-unused-vars
const logger = require('logger')
const admin = require('firebase-admin')
const db = admin.firestore()
const crypto = require('crypto')

module.exports.GET = async function (req, res) {
  const accountID = res.locals.id ? res.locals.id : ''

  const resultFilter = obj =>
    ({
      total_line_items_price,
      confirmed,
      name,
      source_name,
      location_id,
      test,
      shipping_lines,
      reference,
      buyer_accepts_marketing,
      cancelled_at,
      total_tax,
      processing_method,
      customer_locale,
      id,
      financial_status,
      browser_ip,
      cancel_reason,
      closed_at,
      note,
      total_weight,
      phone,
      fulfillments,
      subtotal_price,
      customer,
      gateway,
      admin_graphql_api_id,
      app_id,
      created_at,
      checkout_token,
      source_url,
      email,
      contact_email,
      referring_site,
      accountId,
      order_number,
      total_discounts,
      user_id,
      fulfillment_status,
      tags,
      processed_at,
      updated_at,
      refunds,
      token,
      cart_token,
      currency,
      taxes_included,
      source_identifier,
      total_price,
      order_status_url,
      line_items,
      checkout_id,
      billing_address,
      shipping_address
    } = JSON.parse(JSON.stringify(obj).replace(/:null/gi, ':""')))

  const accounts = []
  const orders = []
  const results = []

  try {
    if (!accountID) {
      // return all shopify orders for all accounts
      // get accounts
      const accountRef = db.collection('accounts')
      const accountRes = await accountRef.get()

      if (!accountRes.empty) {
        accountRes.forEach(doc => {
          const data = doc.data()
          accounts.push(data)
        })
      }

      // const returnKeys = {total_line_items_price, confirmed, name, source_name, location_id, test, shipping_lines, reference, buyer_accepts_marketing, cancelled_at, total_tax, processing_method, customer_locale, id, financial_status, browser_ip, cancel_reason, closed_at, note, total_weight, phone, fulfillments, subtotal_price, customer, gateway, admin_graphql_api_id, app_id, created_at, checkout_token, source_url, email, contact_email, referring_site, accountId, order_number, total_discounts, user_id, fulfillment_status, tags, processed_at, updated_at, refunds, token, cart_token, currency, taxes_included, source_identifier, total_price, order_status_url, line_items, checkout_id, billing_address, shipping_address};
      const orderRef = db.collectionGroup('orders')
      const queryRes = await orderRef.get()

      if (!queryRes.empty) {
        queryRes.forEach(doc => {
          const data = resultFilter(doc.data())
          const returnedData = data // JSON.parse(JSON.stringify(data).replace(/\:null/gi, "\:\"\""));
          orders.push(returnedData)
        })
      }

      results.push({
        result: { accounts: accounts.length, orders: orders.length },
        accounts: accounts,
        orders: orders
      })
      return { status: 200, response: results.shift() }
    }

    if (Object.entries(req.query).length === 0) {
      // return all orders
      const accountRef = db.collection('accounts').doc(accountID)
      const accountRes = await accountRef.get()
      if (!accountRes.empty) {
        const data = accountRes.data()
        accounts.push(data)
      }

      const orderRef = await accountRef.collection('orders')
      const queryRes = await orderRef.get()

      if (!queryRes.empty) {
        queryRes.forEach(doc => {
          orders.push(resultFilter(doc.data()))
        })
      }

      results.push({
        result: { accounts: accounts.length, orders: orders.length },
        accounts: accounts,
        orders: orders
      })
      return { status: 200, response: results.shift() }
    }

    if (req.query.id) {
      // retrieve by doc id
      const accountRef = db.collection('accounts').doc(accountID)
      const orderRef = await accountRef.collection('orders').doc(req.query.id)
      const order = await orderRef.get()
      const orders = []

      if (order.exists) orders.push(order.data())

      results.push({
        query: req.query,
        result: 'success',
        message: '1 result',
        orders: orders
      })
      return { status: 200, response: results.shift() }
    }

    // get account and orders ref
    const keys = Object.keys(req.query)
    const accountRef = db.collection('accounts').doc(accountID)
    const orderRef = accountRef
      .collection('orders')
      .where(keys[0], '==', req.query[keys[0]])
    // search for docs

    /* keys.forEach(async key => {
      orderRef.where( key, '==', req.query[key] );
    });
    const query = () => {}

    } */
    const queryRes = await orderRef.get()

    if (!queryRes.empty) {
      queryRes.forEach(doc => orders.push(doc.data()))
    }

    results.push({
      query: req.query,
      result: 'success',
      message: orders.length + ' results',
      orders: orders
    })
  } catch (error) {
    console.error('Error getting orders: ', util.inspect(error))
    results.push({
      query: req.query,
      result: 'error',
      message: util.inspect(error)
    })
  }

  return {
    status: 200,
    response: results.length > 1 ? results : results.shift()
  }
}

module.exports.POST = async function (req, res) {
  // make sure account and order id is provided
  if (!res.locals.id) return { status: 400, response: 'Missing Account ID' }

  const accountID = res.locals.id
  const orders = []
  const results = []

  debug('body.id', req.body.id)

  if (req.body.hasOwnProperty('id')) {
    orders.push(req.body)
  } else if (req.body.hasOwnProperty('order')) {
    orders.push(req.body.order)
  } else if (req.body.hasOwnProperty('orders')) {
    // multiple orders
    req.body.orders.forEach(order => {
      orders.push(order)
    })
  } else {
    req.body.id = crypto.randomBytes(20).toString('hex')
    orders.push(req.body)
  }

  for (const order of orders) {
    const orderID = accountID + order.id

    // add account id to order
    order.accountId = accountID
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
        orderId: orderID,
        result: 'error',
        message: util.inspect(error)
      })
    }

    try {
      // save order
      const orderRef = db.collection('accounts').doc(accountID)
      await orderRef
        .collection('orders')
        .doc(orderID)
        .set(order)
      debug('Accepted order ID: ', orderID)
      results.push({ orderId: orderID, result: 'success', message: 'accepted' })
    } catch (error) {
      results.push({
        orderId: orderID,
        result: 'error',
        message: util.inspect(error)
      })
      console.error('Error saving order: ', error)
    }
  }
  return {
    status: 200,
    response: results.length > 1 ? results : results.shift()
  }
}
