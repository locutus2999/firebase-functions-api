/* ==============================
 JSData Mappers for:
 - Firebase Realtime Database
 - Firebase Cloud Firestore
 - MS SQL Server
 - JIRA REST API
 ref: https://www.js-data.io/docs/jsdata-and-nodejs
 ================================= */

const data = module.exports
data.store = require('./adapters')

// Define Mappers
data.store.defineMapper('account_lookup')
data.store.defineMapper('accounts')
data.store.defineMapper('globalDefaults')
