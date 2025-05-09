import request from 'supertest';
import { app } from '../index';
import prisma from '../utils/db';
import { Role } from '@prisma/client';
import { hashPassword } from '../utils/auth';
import { generateToken } from '../utils/jwt';

describe('Company API', () => {
  let superAdminToken: string;
  let adminToken: string;
  let companyId: string;
  let superAdminUser: any;
  let adminUser: any;

  beforeAll(async () => {
    // Create a super admin user for testing
    const hashedPassword = await hashPassword('testpassword123');
    superAdminUser = await prisma.user.create({
      data: {
        email: 'super-admin-company@test.com',
        password: hashedPassword,
        role: Role.SUPER
      }
    });

    // Create a test company
    const company = await prisma.company.create({
      data: {
        name: 'Test Company',
        plan: 'BASIC',
        maxWheels: 2
      }
    });
    companyId = company.id;

    // Create a regular admin user
    adminUser = await prisma.user.create({
      data: {
        email: 'admin-company@test.com',
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
        email: { in: ['super-admin-company@test.com', 'admin-company@test.com'] }
      }
    });
    await prisma.company.deleteMany({
      where: {
        name: { startsWith: 'Test Company' }
      }
    });
  });

  describe('POST /companies', () => {
    it('should create a company when SUPER admin', async () => {
      const res = await request(app)
        .post('/companies')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Test Company Created',
          plan: 'PREMIUM',
          maxWheels: 5
        });

      expect(res.status).toBe(201);
      expect(res.body.company).toHaveProperty('id');
      expect(res.body.company.name).toBe('Test Company Created');
      expect(res.body.company.plan).toBe('PREMIUM');
      expect(res.body.company.maxWheels).toBe(5);
    });

    it('should return 403 when non-SUPER tries to create a company', async () => {
      const res = await request(app)
        .post('/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Company Unauthorized',
          plan: 'BASIC',
          maxWheels: 1
        });

      expect(res.status).toBe(403);
    });

    it('should validate plan values', async () => {
      const res = await request(app)
        .post('/companies')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Test Company Invalid Plan',
          plan: 'INVALID_PLAN',
          maxWheels: 1
        });

      expect(res.status).toBe(400);
    });

    it('should validate maxWheels minimum value', async () => {
      const res = await request(app)
        .post('/companies')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Test Company Invalid MaxWheels',
          plan: 'BASIC',
          maxWheels: 0
        });

      expect(res.status).toBe(400);
    });

    it('should prevent duplicate company names', async () => {
      // First create a company
      await request(app)
        .post('/companies')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Test Company Duplicate',
          plan: 'BASIC',
          maxWheels: 1
        });

      // Try to create another with the same name
      const res = await request(app)
        .post('/companies')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Test Company Duplicate',
          plan: 'BASIC',
          maxWheels: 1
        });

      expect(res.status).toBe(409);
    });
  });

  describe('DELETE /companies/:id', () => {
    let companyToDeleteId: string;
    let companyWithWheelsId: string;

    beforeAll(async () => {
      // Create a company to delete
      const companyToDelete = await prisma.company.create({
        data: {
          name: 'Test Company To Delete',
          plan: 'BASIC',
          maxWheels: 1
        }
      });
      companyToDeleteId = companyToDelete.id;

      // Create a company with wheels
      const companyWithWheels = await prisma.company.create({
        data: {
          name: 'Test Company With Wheels',
          plan: 'BASIC',
          maxWheels: 1,
          wheels: {
            create: [
              {
                name: 'Active Wheel',
                mode: 'ALL_WIN',
                formSchema: {},
                isActive: true,
                slots: {
                  create: [
                    {
                      label: 'Prize 1',
                      probability: 100,
                      prizeCode: 'PRIZE1'
                    }
                  ]
                }
              }
            ]
          }
        }
      });
      companyWithWheelsId = companyWithWheels.id;
    });

    it('should soft delete a company with no active wheels', async () => {
      const res = await request(app)
        .delete(`/companies/${companyToDeleteId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.company.isActive).toBe(false);
      expect(res.body.company.deletedAt).toBeTruthy();
    });

    it('should return 409 when trying to delete a company with active wheels', async () => {
      const res = await request(app)
        .delete(`/companies/${companyWithWheelsId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(409);
    });

    it('should return 403 when non-SUPER tries to delete a company', async () => {
      const res = await request(app)
        .delete(`/companies/${companyToDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 when company does not exist', async () => {
      const res = await request(app)
        .delete(`/companies/non-existent-id`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(404);
    });
  });
}); 