import { PrismaClient, Role, WheelMode, Plan, PlayResult } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Simple password hashing function that doesn't require native modules
function hashPassword(password: string): string {
  // Using SHA-256 for a simple hash - NOT secure for production but works for demo
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  // Use our simple hashing function instead of bcrypt
  const adminPassword = hashPassword('superadmin123');

  // Create SUPER user
  const superUser = await prisma.user.upsert({
    where: { email: 'super@iziwheel.com' },
    update: {},
    create: {
      email: 'super@iziwheel.com',
      password: adminPassword,
      role: Role.SUPER,
    },
  });

  console.log('Created SUPER user:', superUser.email);

  // Create demo company
  const demoCompany = await prisma.company.upsert({
    where: { id: 'demo-company-id' },
    update: {},
    create: {
      id: 'demo-company-id',
      name: 'Demo Company',
      plan: Plan.PREMIUM,
      maxWheels: 3,
    },
  });

  console.log('Created demo company:', demoCompany.name);

  // Create admin user for demo company
  const adminPassword2 = hashPassword('admin123');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      password: adminPassword2,
      role: Role.ADMIN,
      companyId: demoCompany.id,
    },
  });

  console.log('Created ADMIN user for demo company:', adminUser.email);

  // Create demo wheel
  const demoWheel = await prisma.wheel.upsert({
    where: { id: 'demo-wheel-id' },
    update: {},
    create: {
      id: 'demo-wheel-id',
      name: 'Demo Wheel',
      companyId: demoCompany.id,
      mode: WheelMode.RANDOM_WIN,
      isActive: true,
      formSchema: {
        fields: [
          { name: 'fullName', label: 'Full Name', type: 'text', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'phone', label: 'Phone Number', type: 'tel', required: false },
          { name: 'consent', label: 'I agree to receive marketing communications', type: 'checkbox', required: true },
        ],
      },
    },
  });

  console.log('Created demo wheel:', demoWheel.name);

  // Create 8 slots for the demo wheel
  const slotData = [
    { label: 'Win $50 Gift Card', probability: 15, prizeCode: 'GC50' },
    { label: 'Win $100 Gift Card', probability: 5, prizeCode: 'GC100' },
    { label: 'Free Product Sample', probability: 20, prizeCode: 'SAMPLE' },
    { label: '10% Discount Code', probability: 20, prizeCode: 'DISC10' },
    { label: '15% Discount Code', probability: 15, prizeCode: 'DISC15' },
    { label: '20% Discount Code', probability: 10, prizeCode: 'DISC20' },
    { label: 'Free Shipping Code', probability: 10, prizeCode: 'SHIP' },
    { label: 'Premium Membership', probability: 5, prizeCode: 'PREMIUM' },
  ];

  for (const slot of slotData) {
    await prisma.slot.upsert({
      where: {
        id: `demo-slot-${slot.prizeCode}`,
      },
      update: {},
      create: {
        id: `demo-slot-${slot.prizeCode}`,
        wheelId: demoWheel.id,
        label: slot.label,
        probability: slot.probability,
        prizeCode: slot.prizeCode,
      },
    });
  }

  console.log('Created 8 slots for demo wheel');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 