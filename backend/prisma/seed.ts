import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Role, MemberStatus, Gender, TransactionType, ServiceType } from '../src/common/constants/enums';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  await prisma.$transaction([
    prisma.assetMaintenance.deleteMany(),
    prisma.asset.deleteMany(),
    prisma.counselingSession.deleteMany(),
    prisma.prayerRequest.deleteMany(),
    prisma.eventRegistration.deleteMany(),
    prisma.churchEvent.deleteMany(),
    prisma.memberDepartment.deleteMany(),
    prisma.department.deleteMany(),
    prisma.communicationMessage.deleteMany(),
    prisma.communicationCampaign.deleteMany(),
    prisma.contribution.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.attendanceRecord.deleteMany(),
    prisma.member.deleteMany(),
    prisma.family.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const church = await prisma.church.upsert({
    where: { id: 'ck_default_church' },
    update: {
      name: 'Fire Setter International',
      slug: 'fsi',
      email: 'info@fsichurch.org',
      website: 'https://fsichurch.org',
    },
    create: {
      id: 'ck_default_church',
      name: 'Fire Setter International',
      slug: 'fsi',
      email: 'info@fsichurch.org',
      phone: '+1 555 010 0000',
      country: 'USA',
      city: 'Springfield',
      address: '1 Sanctuary Way',
      website: 'https://fsichurch.org',
      currency: 'USD',
      timezone: 'UTC',
      brandColor: '#4f46e5',
      serviceTimes: 'Sunday 9:00 AM & 11:30 AM, Wednesday 6:30 PM',
      plan: 'Starter',
    },
  });

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const users = await Promise.all([
    prisma.user.create({
      data: { email: 'superadmin@church.org', name: 'Super Admin', passwordHash, role: Role.SUPER_ADMIN, churchId: church.id, phone: '+1 555 000 0001' },
    }),
    prisma.user.create({
      data: { email: 'admin@church.org', name: 'Jane Doe', passwordHash, role: Role.CHURCH_ADMIN, churchId: church.id, phone: '+1 555 000 0002' },
    }),
    prisma.user.create({
      data: { email: 'pastor@church.org', name: 'Pastor John Smith', passwordHash, role: Role.SENIOR_PASTOR, churchId: church.id, phone: '+1 555 000 0003' },
    }),
    prisma.user.create({
      data: { email: 'associate@church.org', name: 'Pastor Mary Johnson', passwordHash, role: Role.PASTOR, churchId: church.id, phone: '+1 555 000 0004' },
    }),
    prisma.user.create({
      data: { email: 'finance@church.org', name: 'Peter Osei', passwordHash, role: Role.FINANCE_OFFICER, churchId: church.id, phone: '+1 555 000 0005' },
    }),
    prisma.user.create({
      data: { email: 'leader@church.org', name: 'Grace Adjei', passwordHash, role: Role.DEPARTMENT_LEADER, churchId: church.id, phone: '+1 555 000 0006' },
    }),
    prisma.user.create({
      data: { email: 'member@church.org', name: 'Michael Brown', passwordHash, role: Role.MEMBER, churchId: church.id, phone: '+1 555 000 0007' },
    }),
  ]);

  const superAdmin = users[0];
  const finance = users[4];
  const pastor = users[2];

  const families = await Promise.all([
    prisma.family.create({ data: { name: 'Agyemang Family', address: '14 Maple Street, Springfield', churchId: church.id } }),
    prisma.family.create({ data: { name: 'Addo Family', address: '2 Oak Avenue, Springfield', churchId: church.id } }),
    prisma.family.create({ data: { name: 'Boateng Family', address: '88 Birch Road, Springfield', churchId: church.id } }),
  ]);

  const membersData = [
    { firstName: 'Kwame', lastName: 'Agyemang', email: 'kwame.agyemang@mail.com', gender: 'MALE', familyId: families[0].id, status: 'ACTIVE', joinDate: '2021-03-15', maritalStatus: 'Married' },
    { firstName: 'Ama', lastName: 'Agyemang', email: 'ama.agyemang@mail.com', gender: 'FEMALE', familyId: families[0].id, status: 'ACTIVE', joinDate: '2021-03-15', maritalStatus: 'Married' },
    { firstName: 'Kofi', lastName: 'Agyemang', email: 'kofi.agyemang@mail.com', gender: 'MALE', familyId: families[0].id, status: 'ACTIVE', joinDate: '2015-09-01', maritalStatus: 'Single' },
    { firstName: 'Efua', lastName: 'Addo', email: 'efua.addo@mail.com', gender: 'FEMALE', familyId: families[1].id, status: 'ACTIVE', joinDate: '2019-01-12', maritalStatus: 'Single' },
    { firstName: 'Yaw', lastName: 'Addo', email: 'yaw.addo@mail.com', gender: 'MALE', familyId: families[1].id, status: 'VISITOR', joinDate: '2023-06-20', maritalStatus: 'Single' },
    { firstName: 'Akosua', lastName: 'Boateng', email: 'akosua.boateng@mail.com', gender: 'FEMALE', familyId: families[2].id, status: 'ACTIVE', joinDate: '2018-04-22', maritalStatus: 'Widowed' },
    { firstName: 'Samuel', lastName: 'Boateng', email: 'samuel.boateng@mail.com', gender: 'MALE', familyId: families[2].id, status: 'ACTIVE', joinDate: '2018-04-22', maritalStatus: 'Single' },
    { firstName: 'Sarah', lastName: 'Okon', email: 'sarah.okon@mail.com', gender: 'FEMALE', familyId: null, status: 'ACTIVE', joinDate: '2020-11-03', maritalStatus: 'Married' },
    { firstName: 'Daniel', lastName: 'Mensah', email: 'daniel.mensah@mail.com', gender: 'MALE', familyId: null, status: 'ACTIVE', joinDate: '2022-02-14', maritalStatus: 'Single' },
    { firstName: 'Rebecca', lastName: 'Quaye', email: 'rebecca.quaye@mail.com', gender: 'FEMALE', familyId: null, status: 'INACTIVE', joinDate: '2016-07-30', maritalStatus: 'Married' },
    { firstName: 'Thomas', lastName: 'Darko', email: 'thomas.darko@mail.com', gender: 'MALE', familyId: null, status: 'ACTIVE', joinDate: '2017-10-09', maritalStatus: 'Single' },
    { firstName: 'Esther', lastName: 'Larbi', email: 'esther.larbi@mail.com', gender: 'FEMALE', familyId: null, status: 'ACTIVE', joinDate: '2019-08-25', maritalStatus: 'Married' },
  ];

  const dobOffsetYears = [30, 27, 40, 22, 24, 28, 33, 26, 31, 29, 35, 23];
  const dobOffsetDays = [0, 3, 8, 15, 20, 25, 28, 45, 60, 90, 120, 200];
  const memberIdPrefix = (church.slug ?? 'CH').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'CH';

  const members = await Promise.all(
    membersData.map((m, i) => {
      const dob = new Date();
      dob.setHours(0, 0, 0, 0);
      dob.setDate(dob.getDate() + dobOffsetDays[i]);
      dob.setFullYear(dob.getFullYear() - dobOffsetYears[i]);
      return prisma.member.create({
        data: {
          firstName: m.firstName,
          lastName: m.lastName,
          email: m.email,
          gender: m.gender as Gender,
          membershipStatus: m.status as MemberStatus,
          joinDate: new Date(m.joinDate),
          maritalStatus: m.maritalStatus,
          familyId: m.familyId,
          memberId: `${memberIdPrefix}-${String(i + 1).padStart(4, '0')}`,
          churchId: church.id,
          dateOfBirth: dob,
          phone: `+1 555 ${String(Math.floor(Math.random() * 900) + 100)} ${String(Math.floor(Math.random() * 9000) + 1000)}`,
          city: 'Springfield',
        },
      });
    }),
  );

  for (const f of families) {
    const head = members.find((m) => m.familyId === f.id);
    if (head) await prisma.family.update({ where: { id: f.id }, data: { headMemberId: head.id } });
  }

  const portalPasswordHash = await bcrypt.hash('Portal123!', 10);
  for (const m of members) {
    await prisma.member.update({ where: { id: m.id }, data: { portalPasswordHash } });
  }

  const departments = await Promise.all([
    prisma.department.create({ data: { name: 'Choir', description: 'Praise and worship music ministry', leaderId: users[5].id, churchId: church.id } }),
    prisma.department.create({ data: { name: 'Youth', description: 'Youth and young adults ministry', churchId: church.id } }),
    prisma.department.create({ data: { name: 'Ushers', description: 'Hospitality and ushering team', churchId: church.id } }),
    prisma.department.create({ data: { name: 'Media', description: 'A/V and livestream team', churchId: church.id } }),
    prisma.department.create({ data: { name: "Children's Ministry", description: 'Children church', churchId: church.id } }),
    prisma.department.create({ data: { name: "Women's Fellowship", description: 'Women discipleship fellowship', churchId: church.id } }),
    prisma.department.create({ data: { name: "Men's Fellowship", description: 'Men discipleship fellowship', churchId: church.id } }),
  ]);

  const deptAssignments: Array<[string, string, string]> = [
    [members[0].id, departments[0].id, 'Choir Member'],
    [members[1].id, departments[0].id, 'Choir Leader'],
    [members[4].id, departments[1].id, 'Youth Member'],
    [members[6].id, departments[1].id, 'Youth President'],
    [members[3].id, departments[2].id, 'Head Usher'],
    [members[5].id, departments[6].id, 'Fellowship Secretary'],
    [members[8].id, departments[3].id, 'Media Operator'],
    [members[7].id, departments[4].id, 'Children Teacher'],
    [members[10].id, departments[6].id, 'Men Fellowship Member'],
    [members[11].id, departments[5].id, 'Women Fellowship Member'],
  ];

  for (const [memberId, departmentId, role] of deptAssignments) {
    await prisma.memberDepartment.create({ data: { memberId, departmentId, role } });
  }

  const today = new Date();
  const events = await Promise.all([
    prisma.churchEvent.create({
      data: { title: 'Harvest Thanksgiving', type: 'Harvest', location: 'Main Sanctuary', startDate: new Date(today.getTime() + 5 * 86400000), endDate: new Date(today.getTime() + 5 * 86400000 + 3 * 3600000), capacity: 300, status: 'UPCOMING', churchId: church.id },
    }),
    prisma.churchEvent.create({
      data: { title: 'Youth Conference 2026', type: 'Conference', location: 'Event Center', startDate: new Date(today.getTime() + 12 * 86400000), endDate: new Date(today.getTime() + 14 * 86400000), capacity: 150, status: 'UPCOMING', churchId: church.id },
    }),
    prisma.churchEvent.create({
      data: { title: 'Christmas Eve Service', type: 'Worship', location: 'Main Sanctuary', startDate: new Date(today.getTime() - 2 * 86400000), endDate: new Date(today.getTime() - 2 * 86400000 + 2 * 3600000), capacity: 400, status: 'COMPLETED', churchId: church.id },
    }),
    prisma.churchEvent.create({
      data: { title: 'Marriage Seminar', type: 'Seminar', location: 'Fellowship Hall', startDate: new Date(today.getTime() + 20 * 86400000), endDate: new Date(today.getTime() + 20 * 86400000 + 6 * 3600000), capacity: 100, status: 'UPCOMING', churchId: church.id },
    }),
  ]);

  await prisma.eventRegistration.create({
    data: { eventId: events[0].id, memberId: members[0].id, status: 'CONFIRMED', churchId: church.id },
  });
  await prisma.eventRegistration.create({
    data: { eventId: events[0].id, memberId: members[1].id, status: 'CONFIRMED', churchId: church.id },
  });
  await prisma.eventRegistration.create({
    data: { eventId: events[0].id, memberId: members[7].id, status: 'WAITLIST', churchId: church.id },
  });
  await prisma.eventRegistration.create({
    data: { eventId: events[1].id, memberId: members[4].id, status: 'CONFIRMED', churchId: church.id },
  });
  await prisma.eventRegistration.create({
    data: { eventId: events[1].id, memberId: members[6].id, status: 'CONFIRMED', churchId: church.id },
  });
  await prisma.eventRegistration.create({
    data: { eventId: events[1].id, memberId: members[8].id, status: 'CONFIRMED', churchId: church.id },
  });
  await prisma.eventRegistration.create({
    data: { eventId: events[2].id, memberId: members[2].id, status: 'CONFIRMED', attended: true, churchId: church.id },
  });
  await prisma.eventRegistration.create({
    data: { eventId: events[2].id, memberId: members[9].id, status: 'CONFIRMED', attended: true, churchId: church.id },
  });

  const txSeed = [
    { type: 'TITHE', amount: 1200, memberId: members[0].id, category: 'Tithe', description: 'Monthly tithe' },
    { type: 'TITHE', amount: 800, memberId: members[1].id, category: 'Tithe', description: 'Monthly tithe' },
    { type: 'TITHE', amount: 500, memberId: members[5].id, category: 'Tithe', description: 'Monthly tithe' },
    { type: 'OFFERING', amount: 3500, category: 'Sunday Offering', description: 'Sunday service offering' },
    { type: 'OFFERING', amount: 2750, category: 'Sunday Offering', description: 'Midweek service offering' },
    { type: 'DONATION', amount: 10000, memberId: members[2].id, category: 'Building Fund', description: 'Building project donation' },
    { type: 'DONATION', amount: 1500, memberId: members[7].id, category: 'Missions', description: 'Missions support' },
    { type: 'EXPENSE', amount: 950, category: 'Utilities', description: 'Electricity bill' },
    { type: 'EXPENSE', amount: 600, category: 'Maintenance', description: 'PA system repair' },
    { type: 'EXPENSE', amount: 1200, category: 'Salary', description: 'Staff stipends' },
    { type: 'DONATION', amount: 750, memberId: members[10].id, category: 'Benevolence', description: 'Needy families fund' },
  ];

  const daysAgo = (d: number) => new Date(Date.now() - d * 86400000);
  for (const [i, t] of txSeed.entries()) {
    await prisma.transaction.create({
      data: {
        type: t.type as TransactionType,
        amount: t.amount,
        memberId: t.memberId ?? null,
        category: t.category,
        description: t.description,
        recordedBy: finance.id,
        churchId: church.id,
        date: daysAgo(i * 2),
      },
    });
  }

  for (const [i, m] of members.entries()) {
    if (i % 2 === 0) continue;
    await prisma.attendanceRecord.create({
      data: { memberId: m.id, serviceType: 'SUNDAY' as ServiceType, date: daysAgo(3), checkedInAt: daysAgo(3), checkedInBy: superAdmin.id, churchId: church.id },
    });
    await prisma.attendanceRecord.create({
      data: { memberId: m.id, serviceType: 'SUNDAY' as ServiceType, date: daysAgo(10), checkedInAt: daysAgo(10), checkedInBy: superAdmin.id, churchId: church.id },
    });
  }
  await prisma.attendanceRecord.create({
    data: { memberId: members[0].id, serviceType: 'MIDWEEK' as ServiceType, date: daysAgo(2), checkedInAt: daysAgo(2), checkedInBy: superAdmin.id, churchId: church.id },
  });
  await prisma.attendanceRecord.create({
    data: { memberId: members[2].id, serviceType: 'PRAYER' as ServiceType, date: daysAgo(1), checkedInAt: daysAgo(1), checkedInBy: superAdmin.id, churchId: church.id },
  });

  await prisma.prayerRequest.create({
    data: { memberId: members[5].id, subject: 'Healing for my mother', content: 'Please pray for my mother who is admitted at the hospital.', status: 'IN_PROGRESS', prayedBy: pastor.id, churchId: church.id },
  });
  await prisma.prayerRequest.create({
    data: { memberId: members[8].id, subject: 'Job opportunity', content: 'Praying for a new job after my contract ended.', status: 'OPEN', churchId: church.id },
  });
  await prisma.prayerRequest.create({
    data: { memberId: members[11].id, subject: 'Family restoration', content: 'Pray for peace in our home.', status: 'PRAYED_FOR', prayedForAt: daysAgo(4), prayedBy: pastor.id, churchId: church.id },
  });

  await prisma.counselingSession.create({
    data: { memberId: members[8].id, counselorId: pastor.id, date: daysAgo(2), topic: 'Career transition', notes: 'Encouraged around job search.', status: 'COMPLETED', followUpDate: daysAgo(-5), churchId: church.id },
  });
  await prisma.counselingSession.create({
    data: { memberId: members[9].id, counselorId: pastor.id, date: new Date(Date.now() + 3 * 86400000), topic: 'Marital counseling', notes: 'First session scheduled.', status: 'SCHEDULED', followUpDate: new Date(Date.now() + 10 * 86400000), churchId: church.id },
  });

  const assets = await Promise.all([
    prisma.asset.create({
      data: { name: 'Grand Piano', type: 'EQUIPMENT', serialNumber: 'KP-2021-001', condition: 'GOOD', purchaseDate: new Date('2021-05-12'), purchasePrice: 18500, location: 'Main Sanctuary', notes: 'Used during Sunday worship', churchId: church.id },
    }),
    prisma.asset.create({
      data: { name: 'Toyota Hiace Van', type: 'VEHICLE', serialNumber: 'GH-1234-20', condition: 'GOOD', purchaseDate: new Date('2020-02-02'), purchasePrice: 45000, location: 'Church Garage', churchId: church.id },
    }),
    prisma.asset.create({
      data: { name: 'Sound Mixer', type: 'EQUIPMENT', serialNumber: 'SM-2022-88', condition: 'FAIR', purchaseDate: new Date('2022-08-19'), purchasePrice: 4200, location: 'Media Room', churchId: church.id },
    }),
    prisma.asset.create({
      data: { name: 'Church Bus', type: 'VEHICLE', serialNumber: 'GH-5566-19', condition: 'POOR', purchaseDate: new Date('2019-11-30'), purchasePrice: 62000, location: 'Church Garage', notes: 'Needs transmission service', churchId: church.id },
    }),
    prisma.asset.create({
      data: { name: 'Projector', type: 'EQUIPMENT', serialNumber: 'PRJ-2023-14', condition: 'EXCELLENT', purchaseDate: new Date('2023-01-10'), purchasePrice: 3100, location: 'Main Sanctuary', churchId: church.id },
    }),
  ]);

  await prisma.assetMaintenance.create({
    data: { assetId: assets[1].id, date: daysAgo(30), description: 'Oil change and brake pads', cost: 350, performedBy: 'City Motors', nextDueDate: new Date(Date.now() + 60 * 86400000) },
  });
  await prisma.assetMaintenance.create({
    data: { assetId: assets[3].id, date: daysAgo(14), description: 'Transmission inspection', cost: 200, performedBy: 'City Motors' },
  });

  await prisma.notification.create({
    data: { userId: users[1].id, title: 'Harvest Thanksgiving', message: 'Harvest Thanksgiving is in 5 days. Prepare the program.', read: false },
  });
  await prisma.notification.create({
    data: { userId: users[2].id, title: 'New prayer request', message: 'A new prayer request was submitted for healing.', read: false },
  });

  await prisma.auditLog.create({
    data: { userId: superAdmin.id, action: 'SEED', entity: 'System', details: 'Database seeded with demo data' },
  });

  console.log('Seed complete.');
  console.log('Demo accounts (password: Password123!):');
  console.log('  superadmin@church.org  (Super Admin)');
  console.log('  admin@church.org       (Church Admin)');
  console.log('  pastor@church.org      (Senior Pastor)');
  console.log('  associate@church.org   (Pastor)');
  console.log('  finance@church.org     (Finance Officer)');
  console.log('  leader@church.org      (Department Leader)');
  console.log('  member@church.org      (Member)');
  console.log('Member portal demo (password: Portal123!, login by member ID):');
  for (const m of members.slice(0, 6)) {
    console.log(`  ${m.memberId}  ${m.firstName} ${m.lastName}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
