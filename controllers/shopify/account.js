/* ==============================
account controller for shopify app
================================= */
const { logger, diff } = require('utils')
const { data } = require('services')
const account = module.exports

// get subdomain from shopify url
account.shopName = shop => shop.replace(/([.])\w+/g, '')

account.get = async req => {
  if (!req.query.shop) {
    return { status: 400, response: 'Missing required parameter: shop' }
  }
  const shopName = this.shopName(req.query.shop)
  const defaults = { ...(await data.store.find('globalDefaults', 'shopify')) }
  const accountId = await data.store
    .find('account_lookup', 'shopify/' + shopName)
    .then(result => result.accountId)

  const account = await data.store
    .find('accounts', `${accountId}/shopify`)
    .then(result => Object.assign(defaults, result, { accountId }))

  if (account.shop !== req.query.shop) {
    return {
      status: 400,
      response: `requested shop and returned shop mismatch: Requested:
          ${req.query.shop}, Returned: ${account.shop} accountId: ${account.accountId}`
    }
  }

  return this.update(req, account)
}
account.update = async (req, account = req.session.account) => {
  const before = req.session.account
  const updated = await data.store.update(
    'accounts',
    `${account.accountId}/shopify`,
    account
  )

  // update session
  req.session.account = account
  logger.debug('account updated', diff.detailedDiff(before, updated))
  return updated
}
