import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const volunteerPassword = await bcrypt.hash("volunteer123", 10);

  await prisma.user.upsert({
    where: { email: "admin@kidsclub.org" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@kidsclub.org",
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: "mike@kidsclub.org" },
    update: {},
    create: {
      name: "Mike (Check-In Volunteer)",
      email: "mike@kidsclub.org",
      passwordHash: volunteerPassword,
      role: Role.VOLUNTEER,
    },
  });

  const smithFamily = await prisma.family.create({
    data: {
      parentName: "Sarah Smith",
      phone: "555-010-0001",
      email: "sarah.smith@example.com",
      address: "123 Main Street",
      city: "Anytown",
      state: "ST",
      zip: "00000",
      emergencyContact: "John Smith - 555-010-0099",
      children: {
        create: [
          {
            childName: "Noah Smith",
            birthday: new Date("2016-04-12"),
            grade: "3rd",
            pickupRequired: true,
            pickupNotes: "Dog outside",
          },
        ],
      },
    },
  });

  const jonesFamily = await prisma.family.create({
    data: {
      parentName: "David Jones",
      phone: "555-010-0002",
      email: "david.jones@example.com",
      address: "789 Oak Avenue",
      city: "Anytown",
      state: "ST",
      zip: "00000",
      emergencyContact: "Ann Jones - 555-010-0098",
      children: {
        create: [
          { childName: "Sarah Jones", birthday: new Date("2015-08-02"), grade: "4th", pickupRequired: true },
          { childName: "Emma Jones", birthday: new Date("2017-01-20"), grade: "2nd", pickupRequired: true },
        ],
      },
    },
  });

  const brownFamily = await prisma.family.create({
    data: {
      parentName: "Lisa Brown",
      phone: "555-010-0003",
      email: "lisa.brown@example.com",
      address: "456 Oak Avenue",
      city: "Anytown",
      state: "ST",
      zip: "00000",
      emergencyContact: "Tom Brown - 555-010-0097",
      children: {
        create: [
          { childName: "Caleb Brown", birthday: new Date("2014-11-05"), grade: "5th", pickupRequired: true },
          { childName: "Lily Brown", birthday: new Date("2018-03-15"), grade: "1st", pickupRequired: true },
        ],
      },
    },
  });

  const mikeDriver = await prisma.driver.create({
    data: { name: "Mike Smith", phone: "555-020-0001", loginCode: "VAN1-4829" },
  });
  const sarahDriver = await prisma.driver.create({
    data: { name: "Sarah Lee", phone: "555-020-0002", loginCode: "VAN2-1173" },
  });

  const van1 = await prisma.van.create({
    data: { vanName: "Van 1", driverId: mikeDriver.id, capacity: 15 },
  });
  const van2 = await prisma.van.create({
    data: { vanName: "Van 2", driverId: sarahDriver.id, capacity: 12 },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const event = await prisma.event.create({
    data: {
      eventName: "Kids Club",
      eventDate: today,
      startTime: "18:00",
      endTime: "19:30",
    },
  });

  const noah = await prisma.child.findFirstOrThrow({ where: { childName: "Noah Smith" } });
  const sarahJ = await prisma.child.findFirstOrThrow({ where: { childName: "Sarah Jones" } });
  const emma = await prisma.child.findFirstOrThrow({ where: { childName: "Emma Jones" } });
  const caleb = await prisma.child.findFirstOrThrow({ where: { childName: "Caleb Brown" } });
  const lily = await prisma.child.findFirstOrThrow({ where: { childName: "Lily Brown" } });

  await prisma.routeAssignment.createMany({
    data: [
      { eventId: event.id, driverId: mikeDriver.id, vanId: van1.id, childId: noah.id, stopOrder: 1, status: "ASSIGNED" },
      { eventId: event.id, driverId: mikeDriver.id, vanId: van1.id, childId: sarahJ.id, stopOrder: 2, status: "ASSIGNED" },
      { eventId: event.id, driverId: mikeDriver.id, vanId: van1.id, childId: caleb.id, stopOrder: 3, status: "ASSIGNED" },
      { eventId: event.id, driverId: sarahDriver.id, vanId: van2.id, childId: emma.id, stopOrder: 1, status: "ASSIGNED" },
      { eventId: event.id, driverId: sarahDriver.id, vanId: van2.id, childId: lily.id, stopOrder: 2, status: "ASSIGNED" },
    ],
  });

  console.log("Seed complete.");
  console.log("Admin login: admin@kidsclub.org / admin123");
  console.log("Volunteer login: mike@kidsclub.org / volunteer123");
  console.log("Driver codes: VAN1-4829 (Mike), VAN2-1173 (Sarah)");
  void jonesFamily;
  void brownFamily;
  void smithFamily;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
