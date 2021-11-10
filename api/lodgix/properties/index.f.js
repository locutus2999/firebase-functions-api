/* ==============================
 endpoint for lodgix custom field updates
================================= */
require('dotenv').config()
const logger = require('logger')
const debug = logger.debug
const nodeFetch = require('node-fetch')
const fetch = require('fetch-cookie/node-fetch')(nodeFetch)

const customFields = async function (req, res) {
  try {
    // set form fields
    const loginParams = new URLSearchParams()
    loginParams.append('email', 'mssit@m-s-s.com')
    loginParams.append('password', 'InfoTech45237%')
    loginParams.append('login', 'login')
    loginParams.append('next', '/app/property/list/')
    // post to lodgix to login, redirects to next param
    const loginResponse = await fetch('https://www.lodgix.com/login/', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        accept: '*/*',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        CSRFToken: 'fetch'
      },
      body: loginParams
    })

    if (await loginResponse) {
      const getCookie = (cookieObj, cookieName) => {
        for (const cookieJar of cookieObj) {
          const cookieValue = cookieJar
            .split(';')
            .find(cookiePair => cookiePair.trim().split('=')[0] === cookieName)
          if (cookieValue) {
            return cookieValue.split('=')[1]
          }
        }
        return false
      }

      // get csrf token
      const csrfToken = getCookie(
        loginResponse.headers.raw()['set-cookie'],
        'csrftoken'
      )

      // get json list of properties
      const propertyResponse = await fetch(
        'https://www.lodgix.com/app/property/property/',
        {
          method: 'GET'
        }
      )

      const properties = await propertyResponse.json()

      debug('id:', res.locals.id)

      const response = res.locals.id
        ? properties.find(property => property.id === parseInt(res.locals.id))
        : properties

      if (res.locals.id && csrfToken) {
        // get current custom fields and values
        const customFieldsResponse = await fetch(
          'https://www.lodgix.com/system/properties/setup/custom/get/' +
            res.locals.id
        )
        const customFields = await customFieldsResponse.json()
        response.custom_fields = customFields
        // find field index to update by title
        const updateParams = req.method === 'POST' ? req.body : '' // { title: 'Door Lock Codes', value: '4227' }
        debug('updateParams: ', updateParams)

        if (updateParams && updateParams.title) {
          const customFieldIndex = customFields.findIndex(
            field => field.title === updateParams.title
          )

          // update field value by index
          const customFieldUpdate = {}
          if (customFieldIndex !== -1) {
            customFieldUpdate.field = customFields[customFieldIndex].title
            customFieldUpdate.previous_value =
              customFields[customFieldIndex].value
            customFieldUpdate.new_value = updateParams.value
            customFields[customFieldIndex].value = updateParams.value
          } else {
            customFieldUpdate.field = updateParams.title
            customFieldUpdate.error = `Invalid custom field title: ${updateParams.title}`
          }

          if (
            customFieldIndex !== -1 &&
            customFieldUpdate.previous_value !== customFieldUpdate.new_value
          ) {
            const propertyUpdateResponse = await fetch(
              'https://www.lodgix.com/system/properties/setup/custom/set/' +
                res.locals.id,
              {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                  'content-type': 'application/json',
                  cookie: loginResponse.headers.get('set-cookie'),
                  'x-csrftoken': csrfToken,
                  referer:
                    'https://www.lodgix.com/system/properties/setup/custom/' +
                    res.locals.id
                },
                body: JSON.stringify(customFields)
              }
            )

            const updateProperty = await propertyUpdateResponse.json()

            response.update = Object.assign({
              ...updateProperty,
              ...customFieldUpdate
            })
          } else {
            response.update =
              customFieldIndex === -1
                ? {
                    status: 'ERROR',
                    errors: [customFieldUpdate.error]
                  }
                : {
                    status: 'OK',
                    ...customFieldUpdate,
                    errors: ['New value is the same as current value']
                  }
          }
        }
      }

      return { status: 200, response: response || 'no results' }
    }
  } catch (error) {
    console.error('lodgix/properties/GET', error)
    return { status: 500, response: error }
  }
}

module.exports.GET = customFields
module.exports.POST = customFields
