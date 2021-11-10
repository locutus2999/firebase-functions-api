/* eslint-disable camelcase */

const util = require('util')
require('dotenv').config()
const debug = require('debug')
const { Logging } = require('@google-cloud/logging')
const logging = new Logging()

function debugLine (e) {
  const frame = e.stack.split('\n')[2]
  const lineNumber = frame.split(':')[1]
  const functionName = frame.split(' ')[5]
  return { ...functionName, ...lineNumber }
}

module.exports.reportEvent = function (
  event,
  context = {},
  logName = 'errors'
) {
  const { method, url } = context

  const referrer =
    (context.headers &&
      (context.headers.referrer || context.headers.referer)) ||
    ''
  const userAgent = context.headers && context.headers['user-agent']
  const remoteIp =
    context.ip ||
    (context.headers && context.headers['x-forwarded-for']) ||
    (context.connection && context.connection.remoteAddress) ||
    ''

  const httpRequest = {
    method,
    url,
    userAgent,
    referrer,
    remoteIp
  }

  context = httpRequest

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
    context: { ...context, ...debugLine(event) }
  }

  debug(event)

  // Write the event/error log entry
  return new Promise((resolve, reject) => {
    log.write(log.entry(metadata, Event), error => {
      if (error) {
        return reject(error)
      }
      return resolve()
    })
  })
}

module.exports.debug = console.debug

// ignore "console.table" and "console.dir" for now
const methodNames = ['log', 'warn', 'error', 'debug']

// put all messages interleaved into single list
// so we can see how they all appeared
// each message should have "type" and "message"
const messages = []
/**
 * put the original log methods into a global object
 * so we can do two things:
 *  1: restore the methods when needed
 *  2: print messages without going through proxied methods
 *      like "cnsl.log('my message')"
 */
global.cnsl = {}

methodNames.forEach(methodName => {
  const originalMethod = (global.cnsl[methodName] = console[methodName])

  console[methodName] = function () {
    // save the original message (formatted into a single string)
    // use "util.format" to perform string formatting if needed
    const params = Array.prototype.slice.call(arguments, 1)
    const message = params.length
      ? util.format(arguments[0], ...params)
      : arguments[0]
    messages.push({
      type: methodName, // "log", "warn", "error"
      message
    })

    // call the original method like "console.log"
    originalMethod.apply(console, arguments)
  }
})

// intercept "debug" module logging calls
require('./log-debug')(messages)

/**
 * A method to restore the original console methods
 */
const restore = () => {
  Object.keys(global.cnsl).forEach(methodName => {
    console[methodName] = global.cnsl[methodName]
  })
}

/*
async function createIssue (errorObj = {}, accountId) {
  try {
    const newline = '\n '

    // send to JIRA
    const jiraDesc = []
    errorObj.forEach(obj => {
      const curObj = Object.entries(obj)
      jiraDesc.push(`__${curObj.key}__`)
      console.log(curObj.key)

      for (const [key, value] of Object.entries(curObj.value)) {
        jiraDesc.push(`${key}: ${value}`)
        console.log(`${key}: ${value}`)
      }
    })

    const jiraPayload = {
      fields: {
        project: {
            key: accountId
        },
        // eslint-disable-next-line no-undef
        summary: (metaData && metaData.name) || '' + ' (' + process.env.GCLOUD_PROJECT + '): Error during processing',
        issuetype: {
            id: '10004'
        },
        priority: {
            id: '2'
        },
        description: jiraDesc.join(newline)
      }
    }

    const getSettingsPayload = {
      lookupKey: process.env.GCLOUD_PROJECT,
      nodeKey: 'settings',
      accountId: accountId
    }

    const { JIRA_username, JIRA_password, JIRA_url } = await getdbDataByKey(getSettingsPayload)
    const jiraResponse = fetch(settings.JIRA_url + '/rest/api/2/issue', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${base64.encode(`${settings.JIRA_username}:${settings.JIRA_password}`)}`
      },
      method: 'POST',
      body: JSON.stringify(jiraPayload)
    }).then((res) => {
      return res.json()
    })
    .then((json) => {
      console.log(json)
    })
    .catch(error => console.error('Error', error))
  } catch (error) {
    console.log('Error (2)', error)
  }
}
*/
process.on('beforeExit', () => {
  restore()
  console.log('*** printing saved messages ***')
  messages.forEach(m => {
    console.log('%s: %s', m.type, m.message)
  })
})
