/* ==============================
  this can be used to warm the functions and can also be used for simple testing
================================= */
require('dotenv').config()
var util = require('util')
const logger = require('logger')
const debug = logger.debug
// const admin = require('firebase-admin')
// const db = admin.firestore()
// const crypto = require('crypto')
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
  options: {
    tdsVersion: '7_2',
    encrypt: false,
    enableArithAbort: false,
    rowCollectionOnDone: true
  }
}

async function executeStatement (stmt) {
  try {
    const pool = await sql.connect(config)
    const result = await pool.request().query(stmt)

    return result.recordset
  } catch (error) {
    config.password = ''
    console.error('database connection error', error, config)
    return error
  }
}

module.exports.GET = async function (req, res) {
  try {
    const stmts = [
      `SELECT TOP 10 tblOrderMaster.OrderNumber, tblOrderMaster.WebConfirmationNumber, vwPBShipments.ShipmentDate,
        vwPBShipments.Carrier, vwPBShipments.CarrierService, vwPBShipments.TrackingNum AS TrackingNumber
        FROM tblOrderMaster LEFT JOIN vwPBShipments on vwPBShipments.OrderNumber COLLATE DATABASE_DEFAULT = tblOrderMaster.OrderNumber COLLATE DATABASE_DEFAULT
        WHERE tblOrderMaster.CustomerID = 'RES' ORDER BY tblOrderMaster.WebConfirmationNumber DESC`,
      'SELECT TOP 1 OrderMasterID FROM tblOrderMaster'
    ]

    const fetch = require('node-fetch')
    var ip = fetch('http://api.ipify.org')
      .then(res => res.text())
      .then(body => body)

    debug('server ip:', await ip)

    debug('executeStatement', stmts[0])
    const result = await executeStatement(stmts[0])
    debug('query result:', result)
    return {
      status: 200,
      response: {
        requestedAction: __filename,
        requestingIp: await ip,
        result: result
      }
    }
  } catch (error) {
    return {
      status: 500,
      response: {
        requestedAction: __filename,
        requestingIp: ip,
        error: util.inspect(error)
      }
    }
  }
}
