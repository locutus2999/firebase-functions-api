const utils = require('./functions')
utils.diff = require('deep-object-diff')
utils.logger = require('logger')
utils.path = require('path')
utils.globber = require('./globber')
utils.parent = module.parent.filename

module.exports = utils
