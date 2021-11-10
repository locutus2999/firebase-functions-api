/* ==============================
  this is used to warm the functions and can also be used for simple testing
================================= */
module.exports.GET = function (req, res) {
  return { status: 200, response: { response: 'pong' } }
}
