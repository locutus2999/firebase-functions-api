const handler = module.exports

handler.GET = async (req, res) => {
  const routes = require('../routes')
  res.json({
    resource: req.originalUrl,
    query: req.query,
    params: req.params,
    body: req.body,
    routes: routes.map(route => route.res)
  })
}
