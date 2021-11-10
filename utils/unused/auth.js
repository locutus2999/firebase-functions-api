require('dotenv').config()
// const logger = require('./util/logger')
const admin = require.main.require('firebase-admin')

export function auth (req, res, next) {
  const authorization = req.header('Authorization')
  if (authorization) {
    const token = authorization.split(' ')
    admin
      .auth()
      .verifyIdToken(token[1])
      .then(decodedToken => {
        res.locals.user = decodedToken
        next()
      })
      .catch(err => {
        // log(err);
        console.log(err)
        res.sendStatus(401)
      })
  } else {
    // log('Authorization header is not found');
    res.sendStatus(401)
  }
}
