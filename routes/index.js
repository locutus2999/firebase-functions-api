const { globber } = require('utils')

module.exports = globber.get({
  filePath: 'api/**/**',
  fileMask: '*.f.js',
  strip: 'api'
})

/*
const glob = require('glob')
const camelCase = require('camelcase')
 */
// module.exports = glob
//  .sync('../**/**/*.f.js', { cwd: __dirname, ignore: ['./node_modules/**'] })
/*   .map(fnSource =>
    fnSource.indexOf('api') > -1
      ? {
          // http function, camelcase file path, remove trailing slash and index
          fn: camelCase(fnSource.slice(0, -5).replace('index', '')).replace(
            /\/$/,
            ''
          ),
          src: fnSource.slice(3)
        }
      : {
          // background function, camelcase file path
          fn: camelCase(
            fnSource
              .slice(0, -5)
              .replace('background', '')
              .split('/')
              .join('_')
          ),
          src: fnSource.slice(3)
        }
  )
 */
