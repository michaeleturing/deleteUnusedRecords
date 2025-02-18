const SuiteCloudJestUnitTestRunner = require('@oracle/suitecloud-unit-testing/services/SuiteCloudJestUnitTestRunner.js')

module.exports = {
  defaultProjectFolder: 'src',
  commands: {
    'project:deploy': {
      beforeExecuting: async (args) => {
        await SuiteCloudJestUnitTestRunner.run({
          // Jest configuration options.
        })
        return args
      }
    }
  }
}
