// await-request.js
// Promise wrapper for request module

const request = require('request')

module.exports = async value =>
  new Promise((resolve, reject) => {
    request(value, (error, response, data) => {
      if (error) reject(error)
      else resolve(data)
    })
  })
