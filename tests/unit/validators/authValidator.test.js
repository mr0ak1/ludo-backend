const request = require('supertest');
const mongoose = require('mongoose');
const authValidator = require('../../../src/validators/authValidator');

describe('Auth Validator Tests', () => {
  describe('validateVerifyToken', () => {
    it('should validate correct verify token request', () => {
      const data = {
        firebaseToken: 'valid_firebase_token_here',
        phone: '+919876543210',
      };

      const { error, value } = authValidator.validateVerifyToken(data);

      expect(error).toBeUndefined();
      expect(value.firebaseToken).toBe(data.firebaseToken);
      expect(value.phone).toBe(data.phone);
    });

    it('should reject missing firebaseToken', () => {
      const data = {
        phone: '+919876543210',
      };

      const { error } = authValidator.validateVerifyToken(data);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Firebase token');
    });

    it('should reject invalid phone number', () => {
      const data = {
        firebaseToken: 'token123',
        phone: 'invalid_phone',
      };

      const { error } = authValidator.validateVerifyToken(data);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('phone number');
    });

    it('should accept valid international phone numbers', () => {
      const validPhones = [
        '+919876543210',
        '+441234567890',
        '+33612345678',
        '+919876543210',
      ];

      validPhones.forEach(phone => {
        const data = {
          firebaseToken: 'token123',
          phone,
        };

        const { error } = authValidator.validateVerifyToken(data);
        expect(error).toBeUndefined();
      });
    });

    it('should accept optional deviceToken', () => {
      const data = {
        firebaseToken: 'token123',
        phone: '+919876543210',
        deviceToken: 'device_token_123',
      };

      const { error, value } = authValidator.validateVerifyToken(data);

      expect(error).toBeUndefined();
      expect(value.deviceToken).toBe('device_token_123');
    });
  });

  describe('validateUpdateProfile', () => {
    it('should validate profile update with name', () => {
      const data = {
        name: 'John Doe',
      };

      const { error, value } = authValidator.validateUpdateProfile(data);

      expect(error).toBeUndefined();
      expect(value.name).toBe('John Doe');
    });

    it('should validate profile update with email', () => {
      const data = {
        email: 'user@example.com',
      };

      const { error, value } = authValidator.validateUpdateProfile(data);

      expect(error).toBeUndefined();
      expect(value.email).toBe('user@example.com');
    });

    it('should validate profile update with avatar URL', () => {
      const data = {
        avatar: 'https://example.com/avatar.jpg',
      };

      const { error, value } = authValidator.validateUpdateProfile(data);

      expect(error).toBeUndefined();
      expect(value.avatar).toBe('https://example.com/avatar.jpg');
    });

    it('should reject invalid email', () => {
      const data = {
        email: 'invalid_email',
      };

      const { error } = authValidator.validateUpdateProfile(data);

      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('valid email');
    });

    it('should reject name that is too short', () => {
      const data = {
        name: 'J',
      };

      const { error } = authValidator.validateUpdateProfile(data);

      expect(error).toBeDefined();
    });

    it('should reject name that is too long', () => {
      const data = {
        name: 'A'.repeat(51),
      };

      const { error } = authValidator.validateUpdateProfile(data);

      expect(error).toBeDefined();
    });

    it('should reject if no fields provided', () => {
      const data = {};

      const { error } = authValidator.validateUpdateProfile(data);

      expect(error).toBeDefined();
    });

    it('should accept multiple fields at once', () => {
      const data = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        avatar: 'https://example.com/jane.jpg',
      };

      const { error, value } = authValidator.validateUpdateProfile(data);

      expect(error).toBeUndefined();
      expect(value.name).toBe('Jane Doe');
      expect(value.email).toBe('jane@example.com');
    });
  });

  describe('validateRefreshToken', () => {
    it('should validate refresh token request', () => {
      const data = {
        refreshToken: 'valid_refresh_token',
      };

      const { error, value } = authValidator.validateRefreshToken(data);

      expect(error).toBeUndefined();
      expect(value.refreshToken).toBe('valid_refresh_token');
    });

    it('should reject missing refresh token', () => {
      const data = {};

      const { error } = authValidator.validateRefreshToken(data);

      expect(error).toBeDefined();
    });
  });

  describe('validateDeleteAccount', () => {
    it('should validate delete account request with reason', () => {
      const data = {
        reason: 'Not using the app anymore',
      };

      const { error, value } = authValidator.validateDeleteAccount(data);

      expect(error).toBeUndefined();
      expect(value.reason).toBe('Not using the app anymore');
    });

    it('should accept empty delete request', () => {
      const data = {};

      const { error, value } = authValidator.validateDeleteAccount(data);

      expect(error).toBeUndefined();
    });

    it('should reject reason that is too long', () => {
      const data = {
        reason: 'A'.repeat(501),
      };

      const { error } = authValidator.validateDeleteAccount(data);

      expect(error).toBeDefined();
    });
  });

  describe('formatValidationErrors', () => {
    it('should format validation errors correctly', () => {
      const mockError = {
        details: [
          {
            path: ['email'],
            message: 'Email must be valid',
          },
          {
            path: ['name'],
            message: 'Name is required',
          },
        ],
      };

      const formatted = authValidator.formatValidationErrors(mockError);

      expect(formatted.email).toBe('Email must be valid');
      expect(formatted.name).toBe('Name is required');
    });

    it('should handle nested paths', () => {
      const mockError = {
        details: [
          {
            path: ['address', 'city'],
            message: 'City is required',
          },
        ],
      };

      const formatted = authValidator.formatValidationErrors(mockError);

      expect(formatted['address.city']).toBe('City is required');
    });
  });
});
