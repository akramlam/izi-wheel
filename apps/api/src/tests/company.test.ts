import request from 'supertest';
import { app } from '../index';
import prisma from '../utils/db';
import { Role } from '@prisma/client';
import { hashPassword } from '../utils/auth';
import { generateToken } from '../utils/jwt';

// Generate a unique test identifier to prevent DB conflicts
const testId = Date.now().toString();

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
        email: `super-admin-company-${testId}@test.com`,
        password: hashedPassword,
        role: Role.SUPER,
        isPaid: true
      }
    });

    // Create a test company
    const company = await prisma.company.create({
      data: {
        name: `Test Company ${testId}`,
        plan: 'BASIC',
        maxWheels: 2
      }
    });
    companyId = company.id;

    // Create a regular admin user
    adminUser = await prisma.user.create({
      data: {
        email: `admin-company-${testId}@test.com`,
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
        email: { in: [`super-admin-company-${testId}@test.com`, `admin-company-${testId}@test.com`] }
      }
    });
    await prisma.company.deleteMany({
      where: {
        name: { contains: testId }
      }
    });
  });

  describe('POST /companies', () => {
    it('should create a company when SUPER admin', async () => {
      const res = await request(app)
        .post('/companies')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: `Test Company Created ${testId}-1`,
          plan: 'PREMIUM',
          maxWheels: 5
        });

      expect(res.status).toBe(201);
      expect(res.body.company).toHaveProperty('id');
      expect(res.body.company.name).toBe(`Test Company Created ${testId}-1`);
      expect(res.body.company.plan).toBe('PREMIUM');
      expect(res.body.company.maxWheels).toBe(5);
    });

    it('should return 403 when non-SUPER tries to create a company', async () => {
      const res = await request(app)
        .post('/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Test Company Unauthorized ${testId}-2`,
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
          name: `Test Company Invalid Plan ${testId}-3`,
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
          name: `Test Company Invalid MaxWheels ${testId}-4`,
          plan: 'BASIC',
          maxWheels: 0
        });

      expect(res.status).toBe(400);
    });

    it('should prevent duplicate company names', async () => {
      const duplicateName = `Test Company Duplicate ${testId}-5`;
      // First create a company
      await request(app)
        .post('/companies')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: duplicateName,
          plan: 'BASIC',
          maxWheels: 1
        });

      // Try to create another with the same name
      const res = await request(app)
        .post('/companies')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: duplicateName,
          plan: 'BASIC',
          maxWheels: 1
        });

      expect(res.status).toBe(409);
    });

    it('should create a company with admin invitations when SUPER admin', async () => {
      // Mock the sendInviteEmail function
      jest.spyOn(require('../utils/mailer'), 'sendInviteEmail').mockResolvedValue(undefined);
      
      const res = await request(app)
        .post('/companies')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: `Test Company with Admins ${testId}-8`,
          plan: 'BASIC',
          maxWheels: 3,
          admins: [
            { 
              name: 'Admin User',
              email: `admin-test-${testId}@example.com`, 
              role: 'ADMIN' 
            },
            { 
              name: 'Sub Admin User',
              email: `subadmin-test-${testId}@example.com`, 
              role: 'SUB' 
            }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.company).toHaveProperty('id');
      expect(res.body.company.name).toBe(`Test Company with Admins ${testId}-8`);
      expect(res.body.admins).toHaveLength(2);
      expect(res.body.admins[0]).toHaveProperty('email', `admin-test-${testId}@example.com`);
      expect(res.body.admins[0]).toHaveProperty('role', 'ADMIN');
      expect(res.body.admins[1]).toHaveProperty('email', `subadmin-test-${testId}@example.com`);
      expect(res.body.admins[1]).toHaveProperty('role', 'SUB');
      
      // Verify users were created in the database
      const adminUser = await prisma.user.findUnique({
        where: { email: `admin-test-${testId}@example.com` }
      });
      expect(adminUser).not.toBeNull();
      expect(adminUser?.companyId).toBe(res.body.company.id);
      expect(adminUser?.forcePasswordChange).toBe(true);
      
      // Clean up created users
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [`admin-test-${testId}@example.com`, `subadmin-test-${testId}@example.com`]
          }
        }
      });
    });
  });

  describe('DELETE /companies/:id', () => {
    let companyToDeleteId: string;
    let companyWithWheelsId: string;

    beforeAll(async () => {
      // Create a company to delete
      const companyToDelete = await prisma.company.create({
        data: {
          name: `Test Company To Delete ${testId}-6`,
          plan: 'BASIC',
          maxWheels: 1
        }
      });
      companyToDeleteId = companyToDelete.id;

      // Create a company with wheels
      const companyWithWheels = await prisma.company.create({
        data: {
          name: `Test Company With Wheels ${testId}-7`,
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