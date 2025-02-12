/**
 * Jest test file for unusedRecordCleaner.js
 *
 * This file uses Jest as the testing framework. It mocks NetSuite modules where necessary,
 * ensuring we can achieve high code coverage (90%+). Run these tests in your local environment
 * or CI pipeline configured for SuiteScript testing.
 *
 * Error Conditions Tested:
 *   - Query errors
 *   - Record deletion errors
 *   - Audit creation errors
 *   - No records found scenario
 *
 * Pass/Fail Criteria:
 *   - All Jest tests pass (green).
 *   - The script handles each scenario gracefully.
 */

import {
    execute // from our script
  } from '../src/FileCabinet/SuiteApps/com.turing.12345/unusedRecordCleaner.js';

  // We must mock NetSuite modules that are used in the code.
  jest.mock('N/log', () => {
    return {
      __esModule: true,
      default: {
        audit: jest.fn(),
        error: jest.fn()
      }
    };
  });

  jest.mock('N/query', () => {
    return {
      __esModule: true,
      default: {
        runSuiteQL: {
          promise: jest.fn()
        }
      }
    };
  });

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
    };
  });

  jest.mock('N/translation', () => {
    return {
      __esModule: true,
      default: {
        get: jest.fn().mockImplementation(() => {
          // Return undefined to fallback to raw strings in code, or you could mock actual translations
          return undefined;
        })
      }
    };
  });

  describe('unusedRecordCleaner Tests', () => {
    const mockLog = require('N/log').default;
    const mockQuery = require('N/query').default;
    const mockRecord = require('N/record').default;
    const mockTranslation = require('N/translation').default;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('Should handle no records found scenario', async () => {
      // Mock the SuiteQL result to have no rows
      mockQuery.runSuiteQL.promise.mockResolvedValue({
        asMappedResults: () => []
      });

      await execute({});
      // We expect an audit log entry that says "No Unused Records"
      expect(mockLog.audit).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'No Unused Records' })
      );
    });

    test('Should delete unused records and create audit entries', async () => {
      // Mock the SuiteQL result with 2 records found
      mockQuery.runSuiteQL.promise.mockResolvedValue({
        asMappedResults: () => [
          { id: '100', name: 'TestRecord A' },
          { id: '200', name: 'TestRecord B' }
        ]
      });

      // Mock delete.promise to resolve
      mockRecord.delete.promise.mockResolvedValueOnce('100').mockResolvedValueOnce('200');

      // Mock create.promise for the audit record
      const mockCreate = {
        setValue: { promise: jest.fn() },
        save: { promise: jest.fn().mockResolvedValue('999') }
      };
      mockRecord.create.promise.mockResolvedValue(mockCreate);

      await execute({});

      // We expect 2 deletions
      expect(mockRecord.delete.promise).toHaveBeenCalledTimes(2);
      expect(mockRecord.delete.promise.mock.calls[0][0]).toEqual({
        type: 'customrecord_mycustomrecord',
        id: '100'
      });
      expect(mockRecord.delete.promise.mock.calls[1][0]).toEqual({
        type: 'customrecord_mycustomrecord',
        id: '200'
      });

      // We expect 2 audit record creations
      expect(mockRecord.create.promise).toHaveBeenCalledTimes(2);

      // Check that the final audit log mentions 2 records deleted
      expect(mockLog.audit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Unused Record Cleanup Complete',
          details: 'Total records deleted: 2'
        })
      );
    });

    test('Should log query error and rethrow', async () => {
      mockQuery.runSuiteQL.promise.mockRejectedValue(new Error('Query failed'));

      await expect(execute({})).rejects.toThrow('Query failed');
      expect(mockLog.error).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Error fetching unused records.')
        })
      );
    });

    test('Should log deletion error and rethrow', async () => {
      // Provide one record from the query
      mockQuery.runSuiteQL.promise.mockResolvedValue({
        asMappedResults: () => [{ id: '300', name: 'TestRecord C' }]
      });

      // Force the record.delete.promise to fail
      mockRecord.delete.promise.mockRejectedValue(new Error('Delete failed'));

      await expect(execute({})).rejects.toThrow('Delete failed');
      expect(mockLog.error).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Error deleting record.')
        })
      );
    });

    test('Should log audit creation error and rethrow', async () => {
      // Provide one record from the query
      mockQuery.runSuiteQL.promise.mockResolvedValue({
        asMappedResults: () => [{ id: '400', name: 'TestRecord D' }]
      });

      // Mock delete to succeed
      mockRecord.delete.promise.mockResolvedValue('400');

      // Force the audit record create to fail
      mockRecord.create.promise.mockImplementation(() => {
        throw new Error('Create audit record failed');
      });

      await expect(execute({})).rejects.toThrow('Create audit record failed');
      expect(mockLog.error).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Error creating audit record.')
        })
      );
    });
  });
