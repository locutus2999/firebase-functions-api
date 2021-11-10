/* ====================================
  Search a filepath to generate trigger function names and https endpoints.
  The filepath is used to create a trigger function name and https api endpoint.
  For example, firestore database trigger function called "onCreate" in the
  users collection, would be at db/users/onCreate.f.js, which would generate
  a firebase function called dbUsersOnCreate(). https endpoints could be placed
  in an "api" directory, within subdirectories named in the plural version of
  the Object, for example:

  api/orders.f.js -- OR -- api/v1/orders/index.f.js
  becomes /api/orders/{id}
====================================== */

const logger = require('logger')
const glob = require('glob')
const camelCase = require('camelcase')

/**
 * Dynamically generate api endpoints and function names from file structure
 *
 * @param {Object}  config  configuration object
 * @param {string}  [config.filePath="**\/**"]  filepath mask to search
 * @param {string}  [config.fileMask="*"] filename mask
 * @param {string}  [config.strip]  strip from res & fn names
 * @param {Array}   [config.ignore] array of paths to ignore
 * @returns {Object}  object of matching files with res and fn names
 *
 */

const globber = module.exports

globber.get = ({
  filePath = '**/**',
  fileMask = '*',
  strip = '',
  ignore = []
}) => {
  try {
    ignore.push('**/node_modules/**', require('./').parent, __filename)
    return glob
      .sync(require('./').path.join(filePath, fileMask), { ignore })
      .map(match =>
        Object.assign({
          src: match,
          res: camelCase(
            match
              .replace(strip, '')
              .replace(/\..+/, '')
              .replace('index', '')
              .replace(/\/$/, '')
          ),
          fn: camelCase(
            match
              .replace(strip, '')
              .replace(/\..+/, '')
              .replace('index', '')
              .split('/')
              .join('_')
          )
        })
      )
  } catch (error) {
    logger.debug('error!', error)
    return logger.reportEvent(error, { filePath, fileMask, strip, ignore })
  }
}

globber.load = ({
  globPath = '**/**',
  pattern = '*.f.js',
  ignore = new Set()
}) => {
  try {
    ignore.add('./node_modules/**')
    ignore.add(module.parent.filename)
    ignore.add(__filename)

    this.get({ globPath, pattern, ignore }).map(match => {
      return {
        src: match,
        api: camelCase(match.slice(0, -5).replace('index', '')).replace(
          /\/$/,
          ''
        ), // background function, camelcase file path
        fn: camelCase(match.split('/').join('_'))
      }
    })
  } catch (error) {
    return logger.reportEvent(error, { globPath, pattern, ignore })
  }
}
