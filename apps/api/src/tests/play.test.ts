import { testClient } from '../utils/test-client';
import prisma from '../utils/db';
import redisClient from '../utils/redis';

/**
 * Play endpoint tests
 */
describe('Play API', () => {
  let wheelId: string;
  
  beforeAll(async () => {
    // Set up test wheel with slots
    const company = await prisma.company.create({
      data: {
        name: 'Test Company',
      },
    });
    
    const wheel = await prisma.wheel.create({
      data: {
        companyId: company.id,
        name: 'Test Wheel',
        mode: 'ALL_WIN',
        formSchema: {},
        isActive: true,
      },
    });
    
    wheelId = wheel.id;
    
    // Create test slots
    await prisma.slot.createMany({
      data: [
        {
          wheelId: wheel.id,
          label: 'Prize 1',
          probability: 25,
          prizeCode: 'PRIZE1',
        },
        {
          wheelId: wheel.id,
          label: 'Prize 2',
          probability: 25,
          prizeCode: 'PRIZE2',
        },
        {
          wheelId: wheel.id,
          label: 'Prize 3',
          probability: 25,
          prizeCode: 'PRIZE3',
        },
        {
          wheelId: wheel.id,
          label: 'Prize 4',
          probability: 25,
          prizeCode: 'PRIZE4',
        },
      ],
    });
  });
  
  afterAll(async () => {
    // Clean up test data
    await prisma.slot.deleteMany({
      where: {
        wheelId,
      },
    });
    
    await prisma.wheel.delete({
      where: {
        id: wheelId,
      },
    });
    
    await prisma.company.deleteMany({
      where: {
        name: 'Test Company',
      },
    });
    
    // Close Redis connection
    await redisClient.quit();
  });
  
  test('Should spin the wheel and receive a prize', async () => {
    const response = await testClient
      .post(`/companies/1/wheels/${wheelId}/play`)
      .send({});
    
    expect(response.status).toBe(200);
    expect(response.body.play).toBeDefined();
    expect(response.body.play.result).toBe('WIN');
    expect(response.body.play.prize).toBeDefined();
    expect(response.body.play.prize.pin).toBeDefined();
    expect(response.body.play.prize.qrLink).toBeDefined();
    expect(response.body.slot).toBeDefined();
  });
  
  test('Should not be rate limited for first play', async () => {
    const response = await testClient
      .post(`/companies/1/wheels/${wheelId}/play`)
      .send({});
    
    expect(response.status).toBe(200);
  });
  
  test('Should be rate limited for repeated plays', async () => {
    // First play
    await testClient
      .post(`/companies/1/wheels/${wheelId}/play`)
      .send({});
    
    // Second play should be rate limited
    const response = await testClient
      .post(`/companies/1/wheels/${wheelId}/play`)
      .send({});
    
    expect(response.status).toBe(429);
    expect(response.body.error).toContain('Rate limit');
  });
  
  test('Should redeem a prize with correct PIN', async () => {
    // First create a play to get a prize
    const playResponse = await testClient
      .post(`/companies/1/wheels/${wheelId}/play`)
      .send({});
    
    const playId = playResponse.body.play.id;
    const pin = playResponse.body.play.prize.pin;
    
    // Redeem the prize
    const redeemResponse = await testClient
      .put(`/plays/${playId}/redeem`)
      .send({ pin });
    
    expect(redeemResponse.status).toBe(200);
    expect(redeemResponse.body.prize).toBeDefined();
    expect(redeemResponse.body.prize.redeemedAt).toBeDefined();
  });
  
  test('Should not redeem with incorrect PIN', async () => {
    // First create a play to get a prize
    const playResponse = await testClient
      .post(`/companies/1/wheels/${wheelId}/play`)
      .send({});
    
    const playId = playResponse.body.play.id;
    
    // Try to redeem with wrong PIN
    const redeemResponse = await testClient
      .put(`/plays/${playId}/redeem`)
      .send({ pin: '000000' });
    
    expect(redeemResponse.status).toBe(400);
    expect(redeemResponse.body.error).toContain('Invalid PIN');
  });
}); 