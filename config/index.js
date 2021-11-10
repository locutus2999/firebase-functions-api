const { globber } = require('utils')
const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG)

const config = {
  api: { root: 'api' },
  bgFunctions: { root: 'background' },
  firebase: firebaseConfig,
  serviceAccounts: globber
    .get({
      filePath: 'config/service_accounts',
      fileMask: `${firebaseConfig.projectId}**.json`,
      strip: `config/service_accounts/${firebaseConfig.projectId}`
    })
    .map(acct => (this[acct.res] = require(acct.src)))
}

module.exports = config
