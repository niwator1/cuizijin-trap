import {
  Validator,
  ValidationRules,
  CommonValidators,
  validateObject,
  sanitizeUrl,
  extractDomain
} from '../shared/utils/validation';

import {
  AppError,
  ErrorType,
  ErrorSeverity,
  ValidationError,
  AuthenticationError,
  NetworkError,
  DatabaseError,
  ProxyError,
  ErrorHandler
} from '../shared/utils/errorHandler';

describe('Validation System', () => {
  describe('Basic Validation Rules', () => {
    test('required rule should work correctly', async () => {
      const validator = new Validator().addRule(ValidationRules.required());
      
      expect((await validator.validate('')).isValid).toBe(false);
      expect((await validator.validate(null)).isValid).toBe(false);
      expect((await validator.validate(undefined)).isValid).toBe(false);
      expect((await validator.validate('test')).isValid).toBe(true);
      expect((await validator.validate(0)).isValid).toBe(true);
    });

    test('minLength rule should work correctly', async () => {
      const validator = new Validator().addRule(ValidationRules.minLength(5));
      
      expect((await validator.validate('test')).isValid).toBe(false);
      expect((await validator.validate('testing')).isValid).toBe(true);
      expect((await validator.validate('')).isValid).toBe(true); // 空值应该通过
    });

    test('maxLength rule should work correctly', async () => {
      const validator = new Validator().addRule(ValidationRules.maxLength(10));
      
      expect((await validator.validate('test')).isValid).toBe(true);
      expect((await validator.validate('this is too long')).isValid).toBe(false);
    });

    test('url rule should work correctly', async () => {
      const validator = new Validator().addRule(ValidationRules.url());
      
      expect((await validator.validate('https://example.com')).isValid).toBe(true);
      expect((await validator.validate('http://example.com')).isValid).toBe(true);
      expect((await validator.validate('example.com')).isValid).toBe(true);
      expect((await validator.validate('invalid-url')).isValid).toBe(false);
      expect((await validator.validate('')).isValid).toBe(true); // 空值应该通过
    });

    test('domain rule should work correctly', async () => {
      const validator = new Validator().addRule(ValidationRules.domain());
      
      expect((await validator.validate('example.com')).isValid).toBe(true);
      expect((await validator.validate('sub.example.com')).isValid).toBe(true);
      expect((await validator.validate('invalid..domain')).isValid).toBe(false);
      expect((await validator.validate('toolongdomainname'.repeat(10) + '.com')).isValid).toBe(false);
    });

    test('password rule should work correctly', async () => {
      const validator = new Validator().addRule(ValidationRules.password(8));
      
      expect((await validator.validate('short')).isValid).toBe(false);
      expect((await validator.validate('longenough')).isValid).toBe(true);
    });

    test('passwordConfirm rule should work correctly', async () => {
      const originalPassword = 'mypassword';
      const validator = new Validator().addRule(ValidationRules.passwordConfirm(originalPassword));
      
      expect((await validator.validate('mypassword')).isValid).toBe(true);
      expect((await validator.validate('different')).isValid).toBe(false);
    });

    test('email rule should work correctly', async () => {
      const validator = new Validator().addRule(ValidationRules.email());
      
      expect((await validator.validate('test@example.com')).isValid).toBe(true);
      expect((await validator.validate('invalid-email')).isValid).toBe(false);
      expect((await validator.validate('')).isValid).toBe(true); // 空值应该通过
    });

    test('port rule should work correctly', async () => {
      const validator = new Validator().addRule(ValidationRules.port());
      
      expect((await validator.validate(80)).isValid).toBe(true);
      expect((await validator.validate(65535)).isValid).toBe(true);
      expect((await validator.validate(0)).isValid).toBe(false);
      expect((await validator.validate(65536)).isValid).toBe(false);
    });
  });

  describe('Common Validators', () => {
    test('siteUrl validator should work correctly', async () => {
      const validator = CommonValidators.siteUrl();
      
      const validResult = await validator.validate('https://example.com');
      expect(validResult.isValid).toBe(true);
      
      const invalidResult = await validator.validate('');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('请输入网站URL');
    });

    test('password validator should work correctly', async () => {
      const validator = CommonValidators.password(8);
      
      const validResult = await validator.validate('validpassword');
      expect(validResult.isValid).toBe(true);
      
      const invalidResult = await validator.validate('short');
      expect(invalidResult.isValid).toBe(false);
    });

    test('passwordConfirm validator should work correctly', async () => {
      const originalPassword = 'mypassword';
      const validator = CommonValidators.passwordConfirm(originalPassword);
      
      const validResult = await validator.validate('mypassword');
      expect(validResult.isValid).toBe(true);
      
      const invalidResult = await validator.validate('different');
      expect(invalidResult.isValid).toBe(false);
    });
  });

  describe('Object Validation', () => {
    test('should validate multiple fields correctly', async () => {
      const data = {
        url: 'https://example.com',
        title: 'Test Site',
        description: 'A test website',
        password: 'validpassword',
        confirmPassword: 'validpassword'
      };

      const validators = {
        url: CommonValidators.siteUrl(),
        title: CommonValidators.siteTitle(),
        description: CommonValidators.siteDescription(),
        password: CommonValidators.password(),
        confirmPassword: CommonValidators.passwordConfirm(data.password)
      };

      const result = await validateObject(data, validators);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    test('should return errors for invalid fields', async () => {
      const data = {
        url: '',
        title: 'x'.repeat(300), // 太长
        password: 'short',
        confirmPassword: 'different'
      };

      const validators = {
        url: CommonValidators.siteUrl(),
        title: CommonValidators.siteTitle(),
        password: CommonValidators.password(),
        confirmPassword: CommonValidators.passwordConfirm('original')
      };

      const result = await validateObject(data, validators);
      expect(result.isValid).toBe(false);
      expect(result.errors.url).toBeDefined();
      expect(result.errors.title).toBeDefined();
      expect(result.errors.password).toBeDefined();
      expect(result.errors.confirmPassword).toBeDefined();
    });
  });

  describe('Utility Functions', () => {
    test('sanitizeUrl should work correctly', () => {
      expect(sanitizeUrl('example.com')).toBe('https://example.com/');
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com/');
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com/');
      expect(sanitizeUrl('  example.com  ')).toBe('https://example.com/');
    });

    test('extractDomain should work correctly', () => {
      expect(extractDomain('https://example.com/path')).toBe('example.com');
      expect(extractDomain('http://sub.example.com')).toBe('sub.example.com');
      expect(extractDomain('example.com')).toBe('example.com');
    });
  });
});

describe('Error Handling System', () => {
  describe('AppError', () => {
    test('should create AppError correctly', () => {
      const error = new AppError(
        'Test error',
        ErrorType.VALIDATION,
        ErrorSeverity.HIGH,
        'TEST_ERROR',
        { field: 'test' }
      );

      expect(error.message).toBe('Test error');
      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.details).toEqual({ field: 'test' });
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    test('should convert to JSON correctly', () => {
      const error = new AppError('Test error', ErrorType.NETWORK);
      const json = error.toJSON();

      expect(json.name).toBe('AppError');
      expect(json.message).toBe('Test error');
      expect(json.type).toBe(ErrorType.NETWORK);
      expect(json.timestamp).toBeDefined();
    });

    test('should return user-friendly messages', () => {
      const validationError = new AppError('Validation failed', ErrorType.VALIDATION);
      expect(validationError.getUserMessage()).toBe('Validation failed');

      const authError = new AppError('Auth failed', ErrorType.AUTHENTICATION);
      expect(authError.getUserMessage()).toBe('密码错误，请重试');

      const networkError = new AppError('Network failed', ErrorType.NETWORK);
      expect(networkError.getUserMessage()).toBe('网络连接错误');
    });
  });

  describe('Specific Error Types', () => {
    test('ValidationError should work correctly', () => {
      const error = new ValidationError('Invalid input', 'email', 'invalid-email');

      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toBeInstanceOf(AppError);
      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.severity).toBe(ErrorSeverity.LOW);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details.field).toBe('email');
      expect(error.details.value).toBe('invalid-email');
    });

    test('AuthenticationError should work correctly', () => {
      const error = new AuthenticationError();
      
      expect(error.type).toBe(ErrorType.AUTHENTICATION);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.message).toBe('认证失败');
    });

    test('NetworkError should work correctly', () => {
      const error = new NetworkError('Connection timeout', { timeout: 5000 });
      
      expect(error.type).toBe(ErrorType.NETWORK);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.details.timeout).toBe(5000);
    });

    test('DatabaseError should work correctly', () => {
      const error = new DatabaseError('Query failed');
      
      expect(error.type).toBe(ErrorType.DATABASE);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
    });

    test('ProxyError should work correctly', () => {
      const startError = new ProxyError('Failed to start', 'start');
      expect(startError.code).toBe('PROXY_START_FAILED');

      const stopError = new ProxyError('Failed to stop', 'stop');
      expect(stopError.code).toBe('PROXY_STOP_FAILED');
    });
  });

  describe('ErrorHandler', () => {
    let errorHandler: ErrorHandler;

    beforeEach(() => {
      errorHandler = ErrorHandler.getInstance();
    });

    test('should handle AppError correctly', () => {
      const originalError = new ValidationError('Test validation error');
      const handledError = errorHandler.handleError(originalError);

      expect(handledError).toEqual(originalError);
      expect(handledError.type).toBe(ErrorType.VALIDATION);
    });

    test('should convert regular Error to AppError', () => {
      const originalError = new Error('Network connection failed');
      const handledError = errorHandler.handleError(originalError);

      expect(handledError).toBeInstanceOf(AppError);
      expect(handledError.type).toBe(ErrorType.NETWORK);
    });

    test('should create error response correctly', () => {
      const error = new ValidationError('Invalid input');
      const response = ErrorHandler.createErrorResponse(error, 'test context');

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid input');
      expect(response.code).toBe('VALIDATION_ERROR');
    });

    test('safeAsync should handle success correctly', async () => {
      const result = await ErrorHandler.safeAsync(async () => {
        return 'success';
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('success');
      }
    });

    test('safeAsync should handle errors correctly', async () => {
      const result = await ErrorHandler.safeAsync(async () => {
        throw new ValidationError('Test error');
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Test error'); // ValidationError的getUserMessage返回原始消息
        expect(result.code).toBe('VALIDATION_ERROR');
      }
    });

    test('safeSync should handle success correctly', () => {
      const result = ErrorHandler.safeSync(() => {
        return 'success';
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('success');
      }
    });

    test('safeSync should handle errors correctly', () => {
      const result = ErrorHandler.safeSync(() => {
        throw new NetworkError('Test error');
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('网络连接错误');
        expect(result.code).toBe('NETWORK_ERROR');
      }
    });
  });
});
