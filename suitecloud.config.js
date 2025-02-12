import SuiteCloudJestUnitTestRunner from '@oracle/suitecloud-unit-testing/services/SuiteCloudJestUnitTestRunner.js' // Ensure the path includes the file extension if necessary

export default {
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
