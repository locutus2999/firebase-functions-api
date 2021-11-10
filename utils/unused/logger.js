
require('dotenv').config()
const debug = (process.env.APP_DEBUG === 'true')
const { Logging } = require('@google-cloud/logging')
const logging = new Logging()

module.exports.reportError = function (err, context = {}) {
  // This is the name of the StackDriver log stream that will receive the log
  // entry. This name can be any valid log stream name, but must contain "err"
  // in order for the error to be picked up by StackDriver Error Reporting.
  const logName = 'errors'
  const log = logging.log(logName)

  // https://cloud.google.com/logging/docs/api/ref_v2beta1/rest/v2beta1/MonitoredResource
  const metadata = {
    resource: {
      type: 'cloud_function',
      labels: { function_name: process.env.FUNCTION_NAME }
    }
  }

  // https://cloud.google.com/error-reporting/reference/rest/v1beta1/ErrorEvent
  const errorEvent = {
    message: err.stack,
    serviceContext: {
      service: process.env.FUNCTION_NAME,
      resourceType: 'cloud_function'
    },
    context: context
  }

  if (debug) {
    console.log(err)
  }

  // Write the error log entry
  return new Promise((resolve, reject) => {
    log.write(log.entry(metadata, errorEvent), (error) => {
      if (error) {
       return reject(error)
      }
      return resolve()
    })
  })
}

module.exports.reportEvent = function (event, context = {}, logName = 'errors') {
  // This is the name of the StackDriver log stream that will receive the log
  // entry. This name can be any valid log stream name, but must contain "err"
  // in order for the error to be picked up by StackDriver Error Reporting.

  const log = logging.log(logName)

  // https://cloud.google.com/logging/docs/api/ref_v2beta1/rest/v2beta1/MonitoredResource
  const metadata = {
    resource: {
      type: 'cloud_function',
      labels: { function_name: process.env.FUNCTION_NAME }
    }
  }

  // https://cloud.google.com/error-reporting/reference/rest/v1beta1/ErrorEvent
  const Event = {
    message: event.stack || event,
    serviceContext: {
      service: process.env.FUNCTION_NAME,
      resourceType: 'cloud_function'
    },
    context: context
  }

  if (debug) console.log(event)

  // Write the event/error log entry
  return new Promise((resolve, reject) => {
    log.write(log.entry(metadata, Event), (error) => {
      if (error) {
       return reject(error)
      }
      return resolve()
    })
  })
}

module.exports.userFacingMessage = function userFacingMessage (error) {
  return error // error.message ? error.message : 'An unknown error occured';
}
