import request from 'supertest';
import mongoose from 'mongoose';
import { User, IUser } from '../../src/models/User';
import { RefreshToken } from '../../src/models/RefreshToken'; // For checking token revocation
import nodemailer from 'nodemailer';
import app from '../../src/server'; // Express app
import bcrypt from 'bcryptjs'; // For checking password change

const mockSendMail = nodemailer.createTransport({}).sendMail as jest.MockedFunction<any>;

describe('Password Routes - Recovery and Change', () => {
  let testUser: IUser;

  beforeEach(async () => {
    testUser = await User.create({
      email: 'passwordtest@example.com',
      password: 'OldPassword123!',
      firstName: 'Password',
      lastName: 'User',
      isEmailVerified: true,
      roles: ['user'],
    });
    mockSendMail.mockClear();
  });

  describe('POST /password/forgot-password', () => {
    it('should send a password reset email for an existing email', async () => {
      const response = await request(app)
        .post('/password/forgot-password')
        .send({ email: testUser.email });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('If an account with that email exists, a password reset link has been sent.');
      expect(mockSendMail).toHaveBeenCalledTimes(1);

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser?.passwordResetToken).toBeDefined();
      expect(updatedUser?.passwordResetExpires).toBeDefined();
    });

    it('should return generic success for a non-existing email and not send email', async () => {
      const response = await request(app)
        .post('/password/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('If an account with that email exists, a password reset link has been sent.');
      expect(mockSendMail).not.toHaveBeenCalled();
    });
  });

  describe('POST /password/reset-password/:token', () => {
    let resetToken: string;

    beforeEach(async () => {
      resetToken = testUser.generatePasswordResetToken();
      await testUser.save();
      // Also, create some dummy refresh tokens for this user to test revocation
      await RefreshToken.create({ userId: testUser._id, token: 'test-token-id-1', expiresAt: new Date(Date.now() + 100000) });
      await RefreshToken.create({ userId: testUser._id, token: 'test-token-id-2', expiresAt: new Date(Date.now() + 100000) });
    });

    it('should reset password with a valid token and new password', async () => {
      const newPassword = 'NewStrongPassword123!';
      const response = await request(app)
        .post(`/password/reset-password/${resetToken}`)
        .send({ password: newPassword });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password has been reset successfully');

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser?.passwordResetToken).toBeUndefined();
      expect(updatedUser?.passwordResetExpires).toBeUndefined();
      expect(updatedUser?.passwordChangedAt).toBeInstanceOf(Date);
      const isNewPasswordMatch = await bcrypt.compare(newPassword, updatedUser!.password);
      expect(isNewPasswordMatch).toBe(true);

      // Check if refresh tokens were revoked
      const activeRefreshTokens = await RefreshToken.find({ userId: testUser._id, isRevoked: false });
      expect(activeRefreshTokens.length).toBe(0);
    });

    it('should return 400 for an invalid token', async () => {
      const response = await request(app)
        .post('/password/reset-password/invalidtoken')
        .send({ password: 'NewPassword123!' });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid or expired reset token');
    });

    it('should return 400 if token is expired', async () => {
      testUser.passwordResetExpires = new Date(Date.now() - 1000 * 60 * 70); // 70 mins ago (token expires in 1hr)
      await testUser.save();
      const response = await request(app)
        .post(`/password/reset-password/${resetToken}`)
        .send({ password: 'NewPassword123!' });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid or expired reset token');
    });

    it('should return 400 if new password is too short', async () => {
      const response = await request(app)
        .post(`/password/reset-password/${resetToken}`)
        .send({ password: 'short' });
      expect(response.status).toBe(400); // express-validator error
      // The actual error message structure might vary based on your validateRequest middleware
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].msg).toContain('Password must be at least 8 characters');
    });
  });
});
