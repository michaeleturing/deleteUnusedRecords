/**
 * Jest test file for unusedRecordCleaner.js
 *
 * This file uses Jest as the testing framework. It mocks NetSuite modules where necessary,
 * ensuring we can achieve high code coverage (90%+). Run these tests in your local environment
 * or CI pipeline configured for SuiteScript testing.
 *
 */

import {
  execute // from our script
} from '../src/FileCabinet/SuiteApps/com.turing.12345/unusedRecordCleaner.js'

// We must mock NetSuite modules that are used in the code.
jest.mock('N/log', () => {
  return {
    __esModule: true,
    default: {
      audit: jest.fn(),
      error: jest.fn()
    }
  }
})

jest.mock('N/query', () => {
  return {
    __esModule: true,
    default: {
      runSuiteQL: {
        promise: jest.fn()
      }
    }
  }
})

jest.mock('N/record', () => {
  return {
    __esModule: true,
    default: {
      delete: {
        promise: jest.fn()
      },
      create: {
        promise: jest.fn()
      }
    }
  }
})

jest.mock('N/translation', () => {
  return {
    __esModule: true,
    default: {
      get: jest.fn().mockImplementation(() => {
        // Return undefined to fallback to raw strings in code, or you could mock actual translations
        return undefined
      })
    }
  }
})

describe('unusedRecordCleaner Tests', () => {
  const mockLog = require('N/log').default
  const mockQuery = require('N/query').default
  const mockRecord = require('N/record').default
  const mockTranslation = require('N/translation').default

  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * Test Name: Should handle no records found scenario
   *
   * @async
   * @description
   *  Tests the handling of a situation where the SuiteQL query returns no rows.
   *
   * @param {Object} context - The input parameter for the execute function (unused in this test).
   *
   * Error Conditions:
   *  - If the script does not properly handle empty query results.
   *
   * Acceptable Values or Ranges:
   *  - The query may return an empty array of results.
   *
   * Premise and Assertions:
   *  - Calls the `execute` function with an empty result set from SuiteQL.
   *  - Expects an audit log entry indicating "No Unused Records".
   *
   * Pass/Fail Conditions:
   *  - Passes if the log is called with the correct message.
   *  - Fails if an error is thrown or if the audit log is not called as expected.
   */
  test('Should handle no records found scenario', async () => {
    // Mock the SuiteQL result to have no rows
    mockQuery.runSuiteQL.promise.mockResolvedValue({
      asMappedResults: () => []
    })

    await execute({})
    // We expect an audit log entry that says "No Unused Records"
    expect(mockLog.audit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'No Unused Records' })
    )
  })

  /**
   * Test Name: Should delete unused records and create audit entries
   *
   * @async
   * @description
   *  Tests the normal flow where unused records are found and deleted,
   *  followed by creation of audit records.
   *
   * @param {Object} context - The input parameter for the execute function (unused in this test).
   *
   * Error Conditions:
   *  - If deletion fails or audit record creation fails unexpectedly.
   *
   * Acceptable Values or Ranges:
   *  - The query returns an array of objects each containing an 'id' and 'name'.
   *
   * Premise and Assertions:
   *  - Calls the `execute` function with 2 records found by SuiteQL.
   *  - Expects both records to be deleted and 2 corresponding audit records to be created.
   *
   * Pass/Fail Conditions:
   *  - Passes if the records are deleted and the correct audit log is made.
   *  - Fails if the deletion or audit creation does not happen as expected.
   */
  test('Should delete unused records and create audit entries', async () => {
    // Mock the SuiteQL result with 2 records found
    mockQuery.runSuiteQL.promise.mockResolvedValue({
      asMappedResults: () => [
        { id: '100', name: 'TestRecord A' },
        { id: '200', name: 'TestRecord B' }
      ]
    })

    // Mock delete.promise to resolve
    mockRecord.delete.promise.mockResolvedValueOnce('100').mockResolvedValueOnce('200')

    // Mock create.promise for the audit record
    const mockCreate = {
      setValue: { promise: jest.fn() },
      save: { promise: jest.fn().mockResolvedValue('999') }
    }
    mockRecord.create.promise.mockResolvedValue(mockCreate)

    await execute({})

    // We expect 2 deletions
    expect(mockRecord.delete.promise).toHaveBeenCalledTimes(2)
    expect(mockRecord.delete.promise.mock.calls[0][0]).toEqual({
      type: 'customrecord_mycustomrecord',
      id: '100'
    })
    expect(mockRecord.delete.promise.mock.calls[1][0]).toEqual({
      type: 'customrecord_mycustomrecord',
      id: '200'
    })

    // We expect 2 audit record creations
    expect(mockRecord.create.promise).toHaveBeenCalledTimes(2)

    // Check that the final audit log mentions 2 records deleted
    expect(mockLog.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Unused Record Cleanup Complete',
        details: 'Total records deleted: 2'
      })
    )
  })

  /**
   * Test Name: Should log query error and rethrow
   *
   * @async
   * @description
   *  Tests handling of errors that occur when the SuiteQL query fails.
   *
   * @param {Object} context - The input parameter for the execute function (unused in this test).
   *
   * Error Conditions:
   *  - An exception thrown by runSuiteQL.promise.
   *
   * Acceptable Values or Ranges:
   *  - runSuiteQL.promise rejects with an error.
   *
   * Premise and Assertions:
   *  - Calls the `execute` function but the query fails.
   *  - Expects the script to log the error and rethrow it.
   *
   * Pass/Fail Conditions:
   *  - Passes if the error is logged and rethrown.
   *  - Fails if the error is not handled correctly.
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
