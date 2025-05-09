import { uploadAsset, deleteAsset } from '../utils/uploader';
import { sendInviteEmail, sendPrizeEmail } from '../utils/mailer';
import { v2 as cloudinary } from 'cloudinary';

// Mock Cloudinary
jest.mock('cloudinary', () => {
  return {
    v2: {
      config: jest.fn(),
      uploader: {
        upload_stream: jest.fn((options, callback) => {
          // Create a mock stream that immediately calls the callback
          const mockStream = {
            write: jest.fn(),
            end: jest.fn(() => {
              callback(null, {
                public_id: 'test-public-id',
                secure_url: 'https://res.cloudinary.com/test/image/upload/test-public-id',
              });
            }),
          };
          return mockStream;
        }),
        destroy: jest.fn().mockResolvedValue({ result: 'ok' }),
      },
    },
  };
});

// Mock Nodemailer
jest.mock('nodemailer', () => {
  return {
    createTransport: jest.fn(() => ({
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    })),
  };
});

describe('Integration Tests', () => {
  describe('Cloudinary Integration', () => {
    it('should upload an asset successfully', async () => {
      const buffer = Buffer.from('test image data');
      const folder = 'test-folder';
      const filename = 'test-image';

      const result = await uploadAsset(buffer, folder, filename);

      expect(result).toEqual({
        public_id: 'test-public-id',
        secure_url: 'https://res.cloudinary.com/test/image/upload/test-public-id',
      });
    });

    it('should delete an asset successfully', async () => {
      await deleteAsset('test-public-id');
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('test-public-id');
    });
  });

  describe('Email Integration', () => {
    it('should send an invitation email', async () => {
      await sendInviteEmail('test@example.com', 'password123', 'Test Company');
      
      // We're just checking that the function doesn't throw an error
      // The actual email sending is mocked
      expect(true).toBe(true);
    });

    it('should send a prize notification email', async () => {
      await sendPrizeEmail(
        'winner@example.com',
        'Free Coffee',
        'https://example.com/qr-code',
        '1234'
      );
      
      // We're just checking that the function doesn't throw an error
      // The actual email sending is mocked
      expect(true).toBe(true);
    });
  });
}); 