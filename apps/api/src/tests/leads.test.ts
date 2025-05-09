import request from 'supertest';
import { app } from '../index';
import prisma from '../utils/db';
import { Role, Plan } from '@prisma/client';
import { hashPassword } from '../utils/auth';
import { generateToken } from '../utils/jwt';

describe('Leads API', () => {
  let adminToken: string;
  let subUserToken: string;
  let companyId: string;
  let wheelId: string;
  let playId: string;
  let basicCompanyId: string;
  let basicCompanyWheelId: string;

  beforeAll(async () => {
    // Create a test company with PREMIUM plan
    const premiumCompany = await prisma.company.create({
      data: {
        name: 'Test Premium Company',
        plan: Plan.PREMIUM,
        maxWheels: 5
      }
    });
    companyId = premiumCompany.id;

    // Create a test company with BASIC plan
    const basicCompany = await prisma.company.create({
      data: {
        name: 'Test Basic Company',
        plan: Plan.BASIC,
        maxWheels: 2
      }
    });
    basicCompanyId = basicCompany.id;

    // Create test users
    const hashedPassword = await hashPassword('testpassword123');
    
    // Admin user for premium company
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin-leads-test@example.com',
        password: hashedPassword,
        role: Role.ADMIN,
        companyId
      }
    });
    
    // Sub user for premium company
    const subUser = await prisma.user.create({
      data: {
        email: 'sub-leads-test@example.com',
        password: hashedPassword,
        role: Role.SUB,
        companyId
      }
    });

    // Create a test wheel for premium company
    const wheel = await prisma.wheel.create({
      data: {
        name: 'Test Wheel with Leads',
        mode: 'ALL_WIN',
        companyId,
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
    });
    wheelId = wheel.id;

    // Create a test wheel for basic company
    const basicWheel = await prisma.wheel.create({
      data: {
        name: 'Test Basic Wheel',
        mode: 'ALL_WIN',
        companyId: basicCompanyId,
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
    });
    basicCompanyWheelId = basicWheel.id;

    // Create a test play with lead data
    const play = await prisma.play.create({
      data: {
        wheelId,
        ip: '127.0.0.1',
        result: 'WIN',
        lead: {
          name: 'Test User',
          email: 'test-lead@example.com',
          phone: '123456789',
          birthDate: '1990-01-01'
        }
      }
    });
    playId = play.id;

    // Generate tokens
    adminToken = generateToken(adminUser);
    subUserToken = generateToken(subUser);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.play.deleteMany({
      where: { wheelId: { in: [wheelId, basicCompanyWheelId] } }
    });
    await prisma.wheel.delete({ where: { id: wheelId } });
    await prisma.wheel.delete({ where: { id: basicCompanyWheelId } });
    await prisma.user.deleteMany({
      where: { 
        email: { 
          in: ['admin-leads-test@example.com', 'sub-leads-test@example.com'] 
        } 
      }
    });
    await prisma.company.delete({ where: { id: companyId } });
    await prisma.company.delete({ where: { id: basicCompanyId } });
  });

  describe('GET /companies/:companyId/wheels/:wheelId/leads', () => {
    it('should return leads data for PREMIUM plan', async () => {
      const res = await request(app)
        .get(`/companies/${companyId}/wheels/${wheelId}/leads`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.leads).toBeInstanceOf(Array);
      expect(res.body.leads.length).toBeGreaterThan(0);
      
      const lead = res.body.leads[0];
      expect(lead.lead).toHaveProperty('name', 'Test User');
      expect(lead.lead).toHaveProperty('email', 'test-lead@example.com');
    });

    it('should return 402 for BASIC plan', async () => {
      // Create a token for a user in the basic company
      const basicAdminUser = await prisma.user.create({
        data: {
          email: 'basic-admin@example.com',
          password: await hashPassword('testpassword123'),
          role: Role.ADMIN,
          companyId: basicCompanyId
        }
      });
      
      const basicAdminToken = generateToken(basicAdminUser);
      
      const res = await request(app)
        .get(`/companies/${basicCompanyId}/wheels/${basicCompanyWheelId}/leads`)
        .set('Authorization', `Bearer ${basicAdminToken}`);

      expect(res.status).toBe(402); // Payment Required
      
      // Clean up
      await prisma.user.delete({ where: { id: basicAdminUser.id } });
    });

    it('should return 403 for SUB users', async () => {
      const res = await request(app)
        .get(`/companies/${companyId}/wheels/${wheelId}/leads`)
        .set('Authorization', `Bearer ${subUserToken}`);

      expect(res.status).toBe(403); // Forbidden
    });

    it('should support date filtering', async () => {
      const res = await request(app)
        .get(`/companies/${companyId}/wheels/${wheelId}/leads?from=2023-01-01&to=2025-12-31`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.leads).toBeInstanceOf(Array);
    });
  });

  describe('GET /companies/:companyId/wheels/:wheelId/leads.csv', () => {
    it('should return CSV data for PREMIUM plan', async () => {
      const res = await request(app)
        .get(`/companies/${companyId}/wheels/${wheelId}/leads.csv`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('text/csv');
      expect(res.header['content-disposition']).toContain('attachment; filename="leads-');
      
      // Check CSV content
      expect(res.text).toContain('ID,Date,Name,Email,Phone,Birth Date,Result,Prize Redeemed');
      expect(res.text).toContain('Test User');
      expect(res.text).toContain('test-lead@example.com');
    });

    it('should return 402 for BASIC plan', async () => {
      // Create a token for a user in the basic company
      const basicAdminUser = await prisma.user.create({
        data: {
          email: 'basic-admin-csv@example.com',
          password: await hashPassword('testpassword123'),
          role: Role.ADMIN,
          companyId: basicCompanyId
        }
      });
      
      const basicAdminToken = generateToken(basicAdminUser);
      
      const res = await request(app)
        .get(`/companies/${basicCompanyId}/wheels/${basicCompanyWheelId}/leads.csv`)
        .set('Authorization', `Bearer ${basicAdminToken}`);

      expect(res.status).toBe(402); // Payment Required
      
      // Clean up
      await prisma.user.delete({ where: { id: basicAdminUser.id } });
    });
  });

  describe('GET /companies/:companyId/statistics', () => {
    it('should support date filtering', async () => {
      const res = await request(app)
        .get(`/companies/${companyId}/statistics?from=2023-01-01&to=2025-12-31`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('dateRange');
      expect(res.body.dateRange).toHaveProperty('from');
      expect(res.body.dateRange).toHaveProperty('to');
    });
  });
}); 