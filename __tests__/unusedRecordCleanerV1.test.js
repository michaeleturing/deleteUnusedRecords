jest.mock('N/log', () => {
  return {
    audit: jest.fn(),
    error: jest.fn()
  }
})

jest.mock('N/query', () => {
  return {
    runSuiteQL: {
      promise: jest.fn()
    }
  }
})

jest.mock('N/record', () => {
  return {
    delete: {
      promise: jest.fn()
    },
    create: {
      promise: jest.fn()
    }
  }
})

jest.mock('N/translation', () => {
  return {
    get: jest.fn().mockImplementation(() => undefined)
  }
})

let execute

beforeEach(() => {
  jest.clearAllMocks()
  delete require.cache[require.resolve('../src/FileCabinet/SuiteApps/com.turing.12345/unusedRecordCleaner.js')];
  ({ execute } = require('../src/FileCabinet/SuiteApps/com.turing.12345/unusedRecordCleaner.js'))
})

/**
 * Test suite for the unusedRecordCleaner module.
 *
 * Premise: Validates that unused records are properly fetched, deleted, and audited.
 * Assertions: Each test verifies correct logging and error handling.
 */
describe('unusedRecordCleaner Tests', () => {
  const mockLog = require('N/log')
  const mockQuery = require('N/query')
  const mockRecord = require('N/record')

  /**
   * Test Case: No Records Found Scenario
   *
   * Premise: When the SuiteQL query returns an empty array.
   * Assertions: Expects an audit log stating "No Unused Records" was logged.
   * Pass: The audit log is correctly called.
   * Fail: The audit log is missing or incorrect.
   */
  test('Should handle no records found scenario', async () => {
    mockQuery.runSuiteQL.promise.mockResolvedValue({ asMappedResults: () => [] })
    await execute({})
    expect(mockLog.audit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'No Unused Records' })
    )
  })

  /**
   * Test Case: Delete Records and Create Audit Entries
   *
   * Premise: When unused records are found, they should be deleted and audit entries created.
   * Assertions: Expects the deletion and audit creation functions to be called the correct number of times.
   * Pass: Both deletion and audit functions are invoked and the final audit summary is logged.
   * Fail: Either deletion or audit creation does not occur as expected.
   */
  test('Should delete unused records and create audit entries', async () => {
    mockQuery.runSuiteQL.promise.mockResolvedValue({
      asMappedResults: () => [{ id: '100', name: 'TestRecord A' }, { id: '200', name: 'TestRecord B' }]
    })
    mockRecord.delete.promise.mockResolvedValueOnce('100').mockResolvedValueOnce('200')
    const mockCreate = {
      setValue: { promise: jest.fn() },
      save: { promise: jest.fn().mockResolvedValue('999') }
    }
    mockRecord.create.promise.mockResolvedValue(mockCreate)

    await execute({})
    expect(mockRecord.delete.promise).toHaveBeenCalledTimes(2)
    expect(mockRecord.create.promise).toHaveBeenCalledTimes(2)
    expect(mockLog.audit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Unused Record Cleanup Complete' })
    )
  })

  /**
   * Test Case: Query Error Handling
   *
   * Premise: When the SuiteQL query fails.
   * Assertions: Expects an error to be thrown and the error log to capture the query error.
   * Pass: The error is correctly thrown and logged.
   * Fail: The error is not thrown or is logged incorrectly.
   */
  test('Should log query error and rethrow', async () => {
    mockQuery.runSuiteQL.promise.mockRejectedValue(new Error('Query failed'))
    await expect(execute({})).rejects.toThrow('Query failed')
    expect(mockLog.error).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Error fetching unused records.')
      })
    )
  })
})
