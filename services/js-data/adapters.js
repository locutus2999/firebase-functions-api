/* ==============================
  JSData Adapters
    An adapter allows two incompatible interfaces to work together.
    In the case of JSData, Mappers define a standard CRUD interface,
    but the drivers for various persistence layers (MongoDB, HTTP, SQL, etc.)
    have different interfaces. JSData implements various adapters on top
    of the various drivers so that you can talk to those various
    persistence layers using a single interface as defined by JSData.
    ref:  https://www.js-data.io/docs/adapter-pattern
          http://api.js-data.io/js-data-rethinkdb/latest/Adapter.html
================================= */

const { Container } = require('js-data')
const { FirebaseAdapter } = require('js-data-firebase')

// Create a data store to hold Adapters and Mappers
const store = new Container()

// Create an instance of FirebaseAdapter for RTDB
const firebase = require('services/firebase')
const rtdb = new FirebaseAdapter({
  db: firebase.database()
})

// Mappers in "store" will use the Firebase RTDB adapter by default
store.registerAdapter('rtdb', rtdb, { default: true })

module.exports = store
