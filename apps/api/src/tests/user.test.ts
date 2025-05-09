import request from 'supertest';
import { app } from '../index';
import prisma from '../utils/db';
import { Role } from '@prisma/client';
import { hashPassword } from '../utils/auth';
import { generateToken } from '../utils/jwt';
import * as mailer from '../utils/mailer';

// Mock the mailer to prevent actual emails from being sent
jest.mock('../utils/mailer', () => ({
  sendInviteEmail: jest.fn().mockResolvedValue(undefined),
  sendPrizeEmail: jest.fn().mockResolvedValue(undefined),
}));

describe('User Management API', () => {
  let adminToken: string;
  let subUserToken: string;
  let superAdminToken: string;
  let companyId: string;
  let adminUser: any;
  let subUser: any;
  let superAdminUser: any;

  beforeAll(async () => {
    // Create a test company
    const company = await prisma.company.create({
      data: {
        name: 'Test User Management Company',
        plan: 'BASIC',
        maxWheels: 2
      }
    });
    companyId = company.id;

    // Create test users with different roles
    const hashedPassword = await hashPassword('testpassword123');
    
    // Admin user
    adminUser = await prisma.user.create({
      data: {
        email: 'admin-user-test@example.com',
        password: hashedPassword,
        role: Role.ADMIN,
        companyId
      }
    });
    
    // Sub user
    subUser = await prisma.user.create({
      data: {
        email: 'sub-user-test@example.com',
        password: hashedPassword,
        role: Role.SUB,
        companyId
      }
    });
    
    // Super admin user
    superAdminUser = await prisma.user.create({
      data: {
        email: 'super-admin-user-test@example.com',
        password: hashedPassword,
        role: Role.SUPER
      }
    });

    // Generate tokens
    adminToken = generateToken(adminUser);
    subUserToken = generateToken(subUser);
    superAdminToken = generateToken(superAdminUser);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'admin-user-test@example.com',
            'sub-user-test@example.com',
            'super-admin-user-test@example.com',
            'new-invited-user@example.com',
            'duplicate-user@example.com'
          ]
        }
      }
    });
    await prisma.company.delete({
      where: { id: companyId }
    });
  });

  describe('GET /companies/:cid/users', () => {
    it('should return all users for a company when ADMIN', async () => {
      const res = await request(app)
        .get(`/companies/${companyId}/users`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users).toBeInstanceOf(Array);
      expect(res.body.users.length).toBeGreaterThanOrEqual(2); // At least admin and sub user
      
      // Check that passwords are not returned
      expect(res.body.users.some(u => u.password)).toBe(false);
    });

    it('should return 403 when SUB user tries to list users', async () => {
      const res = await request(app)
        .get(`/companies/${companyId}/users`)
        .set('Authorization', `Bearer ${subUserToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow SUPER admin to access company users', async () => {
      const res = await request(app)
        .get(`/companies/${companyId}/users`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users).toBeInstanceOf(Array);
    });
  });

  describe('POST /companies/:cid/users', () => {
    it('should invite a new user when ADMIN', async () => {
      const res = await request(app)
        .post(`/companies/${companyId}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'new-invited-user@example.com',
          role: 'SUB'
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe('new-invited-user@example.com');
      expect(res.body.user.role).toBe('SUB');
      expect(res.body.user.companyId).toBe(companyId);
      
      // Verify email was sent
      expect(mailer.sendInviteEmail).toHaveBeenCalled();
    });

    it('should return 403 when SUB user tries to invite a user', async () => {
      const res = await request(app)
        .post(`/companies/${companyId}/users`)
        .set('Authorization', `Bearer ${subUserToken}`)
        .send({
          email: 'another-user@example.com',
          role: 'SUB'
        });

      expect(res.status).toBe(403);
    });

    it('should validate role input', async () => {
      const res = await request(app)
        .post(`/companies/${companyId}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'invalid-role-user@example.com',
          role: 'INVALID_ROLE'
        });

      expect(res.status).toBe(400);
    });

    it('should prevent duplicate emails in the same company', async () => {
      // First create a user
      await request(app)
        .post(`/companies/${companyId}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'duplicate-user@example.com',
          role: 'SUB'
        });

      // Try to create another with the same email
      const res = await request(app)
        .post(`/companies/${companyId}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'duplicate-user@example.com',
          role: 'SUB'
        });

      expect(res.status).toBe(409);
    });
  });

  describe('PUT /companies/:cid/users/:uid', () => {
    let testUserId: string;

    beforeAll(async () => {
      // Create a test user to update
      const hashedPassword = await hashPassword('testpassword123');
      const user = await prisma.user.create({
        data: {
          email: 'update-test-user@example.com',
          password: hashedPassword,
          role: Role.SUB,
          companyId
        }
      });
      testUserId = user.id;
    });

    afterAll(async () => {
      // Clean up test user
      await prisma.user.delete({
        where: { id: testUserId }
      });
    });

    it('should update a user role when ADMIN', async () => {
      const res = await request(app)
        .put(`/companies/${companyId}/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'ADMIN'
        });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('ADMIN');
    });

    it('should update a user active status when ADMIN', async () => {
      const res = await request(app)
        .put(`/companies/${companyId}/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isActive: false
        });

      expect(res.status).toBe(200);
      expect(res.body.user.isActive).toBe(false);
    });

    it('should return 403 when SUB user tries to update a user', async () => {
      const res = await request(app)
        .put(`/companies/${companyId}/users/${testUserId}`)
        .set('Authorization', `Bearer ${subUserToken}`)
        .send({
          role: 'ADMIN'
        });

      expect(res.status).toBe(403);
    });

    it('should validate role input on update', async () => {
      const res = await request(app)
        .put(`/companies/${companyId}/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'INVALID_ROLE'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /companies/:cid/users/:uid', () => {
    let testUserId: string;

    beforeAll(async () => {
      // Create a test user to delete
      const hashedPassword = await hashPassword('testpassword123');
      const user = await prisma.user.create({
        data: {
          email: 'delete-test-user@example.com',
          password: hashedPassword,
          role: Role.SUB,
          companyId
        }
      });
      testUserId = user.id;
    });

    it('should soft delete a user when ADMIN', async () => {
      const res = await request(app)
        .delete(`/companies/${companyId}/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.isActive).toBe(false);
      expect(res.body.user.deletedAt).toBeTruthy();
    });

    it('should return 403 when SUB user tries to delete a user', async () => {
      const res = await request(app)
        .delete(`/companies/${companyId}/users/${testUserId}`)
        .set('Authorization', `Bearer ${subUserToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 when user does not exist', async () => {
      const res = await request(app)
        .delete(`/companies/${companyId}/users/non-existent-id`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
}); 