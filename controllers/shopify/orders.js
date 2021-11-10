/* ================================
  functions for managing orders
================================= */

// const rtdb = require('./rtdb')
// const regexParser = require('regex-parser')

/* module.exports = {
  getOrderDetails: async function (
    lineItems,
    accountId,
    { productLookupKey, lookupKeyRegEx = {} }
  ) {
    try {
      const items = []
      const itemExceptions = []
      const { regExFind, regExReplace } = lookupKeyRegEx
      const regExPattern = regExFind ? regexParser(regExFind) : ''

      for (const item of lineItems) {
        if (item.fulfillment_service === 'marketing-support-services-inc') {
          const getProductPayload = {
            accountId: accountId,
            nodeKey: 'products',
            lookupKey: regExPattern
              ? item[productLookupKey].replace(regExPattern, regExReplace)
              : item[productLookupKey]
          }
          const { publicationNumber } = productLookupKey
            ? await rtdb.getDataByKey(getProductPayload)
            : { PublicationNumber: item.sku } // default to SKU if no lookup key is provided
          if (publicationNumber) {
            items.push({
              PublicationNumber: publicationNumber,
              QuantityOrdered: item.quantity,
              ItemDescription: item.name
            })
          } else {
            // console.warn('Product not found:', getProductPayload)
            // no product lookup key and no sku, add to itemExceptions
            itemExceptions.push({})
          }
        }
      }
      return items
    } catch (error) {
      // TODO: add empty mapping? create Jira ticket? Ignore?
      console.error('getOrderDetails', error)
    }
  }
} */
