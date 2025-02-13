const SuiteCloudJestConfiguration = require('@oracle/suitecloud-unit-testing/jest-configuration/SuiteCloudJestConfiguration.js');
const cliConfig = require('./suitecloud.config.js');

module.exports = SuiteCloudJestConfiguration.build({
  projectFolder: cliConfig.defaultProjectFolder,
  projectType: SuiteCloudJestConfiguration.ProjectType.SUITEAPP
});
