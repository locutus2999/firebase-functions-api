const { globber } = require('utils')

module.exports = globber.get({
  filePath: 'background/**/**',
  fileMask: '*.f.js',
  strip: 'background'
})
