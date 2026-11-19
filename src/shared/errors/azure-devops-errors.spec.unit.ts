import {
  AzureDevOpsError,
  AzureDevOpsAuthenticationError,
  AzureDevOpsValidationError,
  AzureDevOpsResourceNotFoundError,
  AzureDevOpsPermissionError,
  AzureDevOpsRateLimitError,
  isAzureDevOpsError,
  formatAzureDevOpsError,
} from './azure-devops-errors';

describe('Error classes', () => {
  it('AzureDevOpsError has correct name', () => {
    const e = new AzureDevOpsError('base error');
    expect(e.name).toBe('AzureDevOpsError');
    expect(e.message).toBe('base error');
    expect(e).toBeInstanceOf(Error);
  });

  it('AzureDevOpsAuthenticationError has correct name', () => {
    const e = new AzureDevOpsAuthenticationError('auth failed');
    expect(e.name).toBe('AzureDevOpsAuthenticationError');
    expect(e).toBeInstanceOf(AzureDevOpsError);
  });

  it('AzureDevOpsValidationError stores response', () => {
    const resp = { message: 'bad request', statusCode: 400 };
    const e = new AzureDevOpsValidationError('invalid', resp);
    expect(e.name).toBe('AzureDevOpsValidationError');
    expect(e.response).toEqual(resp);
    expect(e).toBeInstanceOf(AzureDevOpsError);
  });

  it('AzureDevOpsValidationError works without response', () => {
    const e = new AzureDevOpsValidationError('invalid');
    expect(e.response).toBeUndefined();
  });

  it('AzureDevOpsResourceNotFoundError has correct name', () => {
    const e = new AzureDevOpsResourceNotFoundError('not found');
    expect(e.name).toBe('AzureDevOpsResourceNotFoundError');
    expect(e).toBeInstanceOf(AzureDevOpsError);
  });

  it('AzureDevOpsPermissionError has correct name', () => {
    const e = new AzureDevOpsPermissionError('no access');
    expect(e.name).toBe('AzureDevOpsPermissionError');
    expect(e).toBeInstanceOf(AzureDevOpsError);
  });

  it('AzureDevOpsRateLimitError stores resetAt', () => {
    const reset = new Date('2024-01-01T00:00:00Z');
    const e = new AzureDevOpsRateLimitError('rate limited', reset);
    expect(e.name).toBe('AzureDevOpsRateLimitError');
    expect(e.resetAt).toBe(reset);
    expect(e).toBeInstanceOf(AzureDevOpsError);
  });
});

describe('isAzureDevOpsError', () => {
  it('returns true for AzureDevOpsError instances', () => {
    expect(isAzureDevOpsError(new AzureDevOpsError('x'))).toBe(true);
    expect(isAzureDevOpsError(new AzureDevOpsAuthenticationError('x'))).toBe(
      true,
    );
    expect(isAzureDevOpsError(new AzureDevOpsResourceNotFoundError('x'))).toBe(
      true,
    );
  });

  it('returns false for plain Error', () => {
    expect(isAzureDevOpsError(new Error('plain'))).toBe(false);
  });

  it('returns false for non-errors', () => {
    expect(isAzureDevOpsError('string')).toBe(false);
    expect(isAzureDevOpsError(null)).toBe(false);
    expect(isAzureDevOpsError(42)).toBe(false);
  });
});

describe('formatAzureDevOpsError', () => {
  it('formats basic AzureDevOpsError', () => {
    const result = formatAzureDevOpsError(
      new AzureDevOpsError('something failed'),
    );
    expect(result).toContain('something failed');
  });

  it('formats AzureDevOpsValidationError with response', () => {
    const e = new AzureDevOpsValidationError('bad', {
      message: 'details',
      statusCode: 400,
    });
    const result = formatAzureDevOpsError(e);
    expect(result).toContain('bad');
    expect(result).toContain('details');
  });

  it('formats AzureDevOpsValidationError without response', () => {
    const e = new AzureDevOpsValidationError('no response');
    const result = formatAzureDevOpsError(e);
    expect(result).toContain('no response');
  });

  it('formats AzureDevOpsRateLimitError with resetAt', () => {
    const reset = new Date('2024-06-01T12:00:00Z');
    const e = new AzureDevOpsRateLimitError('rate limited', reset);
    const result = formatAzureDevOpsError(e);
    expect(result).toContain('2024-06-01');
  });

  it('handles null', () => {
    expect(formatAzureDevOpsError(null)).toBe('null');
  });

  it('handles undefined', () => {
    expect(formatAzureDevOpsError(undefined)).toBe('undefined');
  });

  it('handles string', () => {
    expect(formatAzureDevOpsError('plain string')).toBe('plain string');
  });

  it('handles number', () => {
    expect(formatAzureDevOpsError(42)).toBe('42');
  });

  it('handles boolean', () => {
    expect(formatAzureDevOpsError(true)).toBe('true');
  });
});
