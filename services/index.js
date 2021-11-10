/* ==============================
 Data & Service Providers:
 - Data Resources (SQL, NoSQL and CRUD APIs)
  - Firebase Cloud Firestore
  - Firebase RTDB
  - MS SQL Server
  - JIRA
 - Service Resources:
  - Firebase Functions
  - Node-RED*
  - E-mail*
================================= */

/* const { redApp, red } = require('./nodeRed') */
// const { logger } = require('utils')
const services = require('./services')
const data = require('./js-data')

// logger.debug('Data:', data)
// logger.debug('Services:', providers)

module.exports = {
  ...services,
  data
}
