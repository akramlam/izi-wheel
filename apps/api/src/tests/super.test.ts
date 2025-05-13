import request from 'supertest';
import { app } from '../index';
import prisma from '../utils/db';
import { Role, Plan } from '@prisma/client';
import { hashPassword } from '../utils/auth';
import { generateToken } from '../utils/jwt';

describe('Super Admin Console API', () => {
  let superAdminToken: string;
  let adminToken: string;
  let companyId: string;
  let superAdminUser: any;
  let adminUser: any;

  beforeAll(async () => {
    // Create a test company
    const company = await prisma.company.create({
      data: {
        name: 'Test Super Admin Company',
        plan: Plan.BASIC,
        maxWheels: 2
      }
    });
    companyId = company.id;

    // Create test users
    const hashedPassword = await hashPassword('testpassword123');
    
    // Super admin user
    superAdminUser = await prisma.user.create({
      data: {
        email: 'super-admin-test@example.com',
        password: hashedPassword,
        role: Role.SUPER,
        isPaid: true
      }
    });
    
    // Regular admin user
    adminUser = await prisma.user.create({
      data: {
        email: 'admin-super-test@example.com',
        password: hashedPassword,
        role: Role.ADMIN,
        companyId: company.id
      }
    });

    // Generate tokens
    superAdminToken = generateToken(superAdminUser);
    adminToken = generateToken(adminUser);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['super-admin-test@example.com', 'admin-super-test@example.com']
        }
      }
    });
    await prisma.company.delete({
      where: { id: companyId }
    });
  });

  describe('PATCH /companies/:id/plan', () => {
    it('should update a company plan when SUPER admin', async () => {
      const res = await request(app)
        .patch(`/companies/${companyId}/plan`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          plan: 'PREMIUM',
          maxWheels: 10
        });

      expect(res.status).toBe(200);
      expect(res.body.company).toHaveProperty('plan', 'PREMIUM');
      expect(res.body.company).toHaveProperty('maxWheels', 10);
    });

    it('should return 403 when non-SUPER tries to update plan', async () => {
      const res = await request(app)
        .patch(`/companies/${companyId}/plan`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          plan: 'BASIC',
          maxWheels: 1
        });

      expect(res.status).toBe(403);
    });

    it('should validate plan values', async () => {
      const res = await request(app)
        .patch(`/companies/${companyId}/plan`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          plan: 'INVALID_PLAN',
          maxWheels: 5
        });

      expect(res.status).toBe(400);
    });

    it('should validate maxWheels minimum value', async () => {
      const res = await request(app)
        .patch(`/companies/${companyId}/plan`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          plan: 'BASIC',
          maxWheels: 0
        });

      expect(res.status).toBe(400);
    });

    it('should allow updating only plan', async () => {
      const res = await request(app)
        .patch(`/companies/${companyId}/plan`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          plan: 'BASIC'
        });

      expect(res.status).toBe(200);
      expect(res.body.company).toHaveProperty('plan', 'BASIC');
    });

    it('should allow updating only maxWheels', async () => {
      const res = await request(app)
        .patch(`/companies/${companyId}/plan`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          maxWheels: 5
        });

      expect(res.status).toBe(200);
      expect(res.body.company).toHaveProperty('maxWheels', 5);
    });

    it('should return 404 when company does not exist', async () => {
      const res = await request(app)
        .patch(`/companies/non-existent-id/plan`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          plan: 'PREMIUM',
          maxWheels: 10
        });

      expect(res.status).toBe(404);
    });
  });
}); 