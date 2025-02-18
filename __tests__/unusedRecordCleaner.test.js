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
  delete require.cache[
    require.resolve(
      '../src/FileCabinet/SuiteApps/com.turing.12345/unusedRecordCleaner.js'
    )
    ];
  ({ execute } = require(
    '../src/FileCabinet/SuiteApps/com.turing.12345/unusedRecordCleaner.js'
  ))
})

describe('unusedRecordCleaner Tests', () => {
  const mockLog = require('N/log')
  const mockQuery = require('N/query')
  const mockRecord = require('N/record')

  test('Should handle no records found scenario', async () => {
    mockQuery.runSuiteQL.promise.mockResolvedValue({
      asMappedResults: () => []
    })
    await execute({})
    expect(mockLog.audit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'No Unused Records' })
    )
  })

  test('Should delete unused records and create audit entries', async () => {
    mockQuery.runSuiteQL.promise.mockResolvedValue({
      asMappedResults: () => [
        { id: '100', name: 'TestRecord A' },
        { id: '200', name: 'TestRecord B' }
      ]
    })
    mockRecord.delete.promise
      .mockResolvedValueOnce('100')
      .mockResolvedValueOnce('200')
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

  test('Should log query error and rethrow', async () => {
    mockQuery.runSuiteQL.promise.mockRejectedValue(new Error('Query failed'))
    await expect(execute({})).rejects.toThrow('Query failed')
    expect(mockLog.error).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Error fetching unused records.')
      })
    )
  })

  test('Should log deletion error and rethrow', async () => {
    mockQuery.runSuiteQL.promise.mockResolvedValue({
      asMappedResults: () => [{ id: '300', name: 'TestRecord C' }]
    })
    mockRecord.delete.promise.mockRejectedValue(new Error('Delete failed'))
    await expect(execute({})).rejects.toThrow('Delete failed')
    expect(mockLog.error).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Error deleting record.')
      })
    )
  })

  test('Should log audit creation error and rethrow', async () => {
    mockQuery.runSuiteQL.promise.mockResolvedValue({
      asMappedResults: () => [{ id: '400', name: 'TestRecord D' }]
    })
    mockRecord.delete.promise.mockResolvedValue('400')
    mockRecord.create.promise.mockImplementation(() => {
      throw new Error('Create audit record failed')
    })
    await expect(execute({})).rejects.toThrow('Create audit record failed')
    expect(mockLog.error).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Error creating audit record.')
      })
    )
  })
})
