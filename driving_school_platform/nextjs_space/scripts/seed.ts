import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Safety guard: never run destructive seed in production by accident
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_PROD_SEED !== "true"
  ) {
    throw new Error(
      "Refusing to run seed in production. Set ALLOW_PROD_SEED=true if you really mean it.",
    );
  }

  // Clear existing data (be careful in production!)
  console.log("🗑️ Clearing existing data...");
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.examRegistration.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.lessonCounter.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.lessonRequest.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.student.deleteMany();
  await prisma.instructor.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
  await prisma.transmissionType.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.configurationHistory.deleteMany();
  await prisma.licenseKey.deleteMany();
  await prisma.organizationFeature.deleteMany();
  await prisma.organizationDomain.deleteMany();
  await prisma.organization.deleteMany();

  // 0. Create Default Organization (multi-tenant baseline)
  console.log("🏢 Creating default organization...");
  const organization = await prisma.organization.create({
    data: {
      name: "A Conquistadora",
      email: "admin@aconquistadora.com",
      phoneNumber: "+1234567890",
      address: "123 Main Street",
      city: "Guimarães",
      postalCode: "4800-000",
      subscriptionTier: "BASE",
      subscriptionStatus: "ACTIVE",
      primaryColor: "#2563eb",
      secondaryColor: "#dc2626",
    },
  });
  const orgId = organization.id;
  console.log(`✅ Organization created: ${organization.name} (${orgId})`);

  // Seed tenant hosts → organization domains
  const hosts = (
    process.env.TENANT_HOSTS ?? "www.meengine.io,meengine-dat.vercel.app"
  )
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);

  for (let i = 0; i < hosts.length; i++) {
    const host = hosts[i];
    await prisma.organizationDomain.upsert({
      where: { host },
      create: { host, organizationId: orgId, isPrimary: i === 0 },
      update: { organizationId: orgId, isPrimary: i === 0 },
    });
  }
  console.log(`✅ Seeded ${hosts.length} organization domains`);

  // Create organization features (disabled by default)
  const featureKeys = [
    "STUDENT_ACCESS",
    "VEHICLE_MANAGEMENT",
    "LESSON_MANAGEMENT",
    "SCREENSHOT_PROTECTION",
    "ADVANCED_REPORTING",
    "SMS_NOTIFICATIONS",
    "MOBILE_APP",
    "PAYMENT_INTEGRATION",
    "MULTI_LANGUAGE",
  ] as const;

  for (const featureKey of featureKeys) {
    await prisma.organizationFeature.upsert({
      where: {
        organizationId_featureKey: {
          organizationId: orgId,
          featureKey,
        },
      },
      create: {
        organizationId: orgId,
        featureKey,
        isEnabled: false,
      },
      update: {},
    });
  }
  console.log("✅ Organization features created (disabled by default)");

  // Create sample license key for testing
  const licenseKey = await prisma.licenseKey.create({
    data: {
      organizationId: orgId,
      key: `LIC-${Date.now()}-SEED`,
      featureKeys: ["STUDENT_ACCESS", "VEHICLE_MANAGEMENT"],
      isUsed: false,
      notes: "Seed sample license key for testing",
    },
  });
  console.log(`✅ Sample license key created: ${licenseKey.key}`);

  // 1. Create Transmission Types
  console.log("📡 Creating transmission types...");
  const manualTransmission = await prisma.transmissionType.create({
    data: {
      name: "Manual",
      code: "MT",
      description: "Manual transmission vehicles",
    },
  });

  const automaticTransmission = await prisma.transmissionType.create({
    data: {
      name: "Automatic",
      code: "AT",
      description: "Automatic transmission vehicles",
    },
  });

  console.log(
    `✅ Created transmission types: ${manualTransmission.name}, ${automaticTransmission.name}`,
  );

  // 2. Create Categories
  console.log("📚 Creating categories...");
  const categories = [
    {
      name: "AM",
      fullName: "Moped",
      description: "Light two-wheel vehicles up to 45km/h",
      transmissionTypeId: automaticTransmission.id,
      minAge: 14,
      minLessonHours: 10,
      displayOrder: 1,
    },
    {
      name: "A1",
      fullName: "Light Motorcycle",
      description: "Light motorcycles up to 125cc",
      transmissionTypeId: manualTransmission.id,
      minAge: 16,
      minLessonHours: 15,
      displayOrder: 2,
    },
    {
      name: "A2",
      fullName: "Medium Motorcycle",
      description: "Medium motorcycles up to 35kW",
      transmissionTypeId: manualTransmission.id,
      minAge: 18,
      minLessonHours: 18,
      displayOrder: 3,
    },
    {
      name: "A",
      fullName: "Motorcycle",
      description: "All motorcycles and motor tricycles",
      transmissionTypeId: manualTransmission.id,
      minAge: 24,
      minLessonHours: 20,
      displayOrder: 4,
    },
    {
      name: "B1",
      fullName: "Light Quadricycle",
      description: "Light quadricycles",
      transmissionTypeId: manualTransmission.id,
      minAge: 16,
      minLessonHours: 15,
      displayOrder: 5,
    },
    {
      name: "B",
      fullName: "Car",
      description: "Passenger vehicles up to 3,500kg",
      transmissionTypeId: manualTransmission.id,
      minAge: 18,
      minLessonHours: 30,
      displayOrder: 6,
    },
    {
      name: "C1",
      fullName: "Light Truck",
      description: "Vehicles from 3,500kg to 7,500kg",
      transmissionTypeId: manualTransmission.id,
      minAge: 18,
      minLessonHours: 35,
      displayOrder: 7,
    },
    {
      name: "C",
      fullName: "Truck",
      description: "Vehicles exceeding 3,500kg",
      transmissionTypeId: manualTransmission.id,
      minAge: 21,
      minLessonHours: 40,
      displayOrder: 8,
    },
    {
      name: "D1",
      fullName: "Small Bus",
      description: "Vehicles with 9-16 passenger seats",
      transmissionTypeId: manualTransmission.id,
      minAge: 21,
      minLessonHours: 45,
      displayOrder: 9,
    },
    {
      name: "D",
      fullName: "Bus",
      description: "Vehicles with more than 8 passenger seats",
      transmissionTypeId: manualTransmission.id,
      minAge: 24,
      minLessonHours: 50,
      displayOrder: 10,
    },
    {
      name: "B+E",
      fullName: "Car with Trailer",
      description: "Car with trailer exceeding 750kg",
      transmissionTypeId: manualTransmission.id,
      minAge: 18,
      minLessonHours: 35,
      displayOrder: 11,
    },
    {
      name: "C+E",
      fullName: "Truck with Trailer",
      description: "Truck with trailer",
      transmissionTypeId: manualTransmission.id,
      minAge: 21,
      minLessonHours: 45,
      displayOrder: 12,
    },
    {
      name: "C1+E",
      fullName: "Light Truck with Trailer",
      description: "Light truck with trailer",
      transmissionTypeId: manualTransmission.id,
      minAge: 18,
      minLessonHours: 40,
      displayOrder: 13,
    },
    {
      name: "D+E",
      fullName: "Bus with Trailer",
      description: "Bus with trailer",
      transmissionTypeId: manualTransmission.id,
      minAge: 24,
      minLessonHours: 55,
      displayOrder: 14,
    },
    {
      name: "D1+E",
      fullName: "Small Bus with Trailer",
      description: "Small bus with trailer",
      transmissionTypeId: manualTransmission.id,
      minAge: 21,
      minLessonHours: 50,
      displayOrder: 15,
    },
  ];

  const createdCategories = await Promise.all(
    categories.map((category) =>
      prisma.category.create({
        data: category,
      }),
    ),
  );

  console.log(`✅ Created ${createdCategories.length} categories`);

  // 3. Create Super Admin User
  console.log("👑 Creating super admin user...");
  const hashedPassword = await bcrypt.hash("Conquistadora!", 12);

  const superAdmin = await prisma.user.create({
    data: {
      email: "conquistadora@drivingschool.com",
      organizationId: orgId,
      passwordHash: hashedPassword,
      role: "SUPER_ADMIN" as any,
      firstName: "Conquistadora",
      lastName: "Admin",
      phoneNumber: "+1-555-0100",
      isEmailVerified: true,
      isApproved: true,
    },
  });

  console.log(
    `✅ Created super admin: ${superAdmin.firstName} ${superAdmin.lastName}`,
  );

  // 4. Create Default Test User (john@doe.com)
  console.log("👤 Creating default test user...");
  const testUserPassword = await bcrypt.hash("johndoe123", 12);

  const testUser = await prisma.user.create({
    data: {
      email: "john@doe.com",
      organizationId: orgId,
      passwordHash: testUserPassword,
      role: "SUPER_ADMIN" as any,
      firstName: "John",
      lastName: "Doe",
      phoneNumber: "+1-555-0001",
      isEmailVerified: true,
      isApproved: true,
    },
  });

  console.log(
    `✅ Created test user: ${testUser.firstName} ${testUser.lastName}`,
  );

  // 5. Create Sample Instructors
  console.log("👨‍🏫 Creating sample instructors...");
  const instructorUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: "michael.johnson@drivingschool.com",
        organizationId: orgId,
        passwordHash: await bcrypt.hash("instructor123", 12),
        role: "INSTRUCTOR" as any,
        firstName: "Michael",
        lastName: "Johnson",
        phoneNumber: "+1-555-0201",
        isEmailVerified: true,
        isApproved: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "sarah.williams@drivingschool.com",
        organizationId: orgId,
        passwordHash: await bcrypt.hash("instructor123", 12),
        role: "INSTRUCTOR" as any,
        firstName: "Sarah",
        lastName: "Williams",
        phoneNumber: "+1-555-0202",
        isEmailVerified: true,
        isApproved: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "david.brown@drivingschool.com",
        organizationId: orgId,
        passwordHash: await bcrypt.hash("instructor123", 12),
        role: "INSTRUCTOR" as any,
        firstName: "David",
        lastName: "Brown",
        phoneNumber: "+1-555-0203",
        isEmailVerified: true,
        isApproved: true,
      },
    }),
  ]);

  const instructors = await Promise.all([
    prisma.instructor.create({
      data: {
        userId: instructorUsers[0].id,
        organizationId: orgId,
        instructorLicenseNumber: "INS-001-2024",
        instructorLicenseExpiry: new Date("2026-12-31"),
        employmentType: "FULL_TIME",
        hourlyRate: 45.0,
        maxLessonsPerDay: 8,
        isAvailableForBooking: true,
        specializations: "Manual transmission, Highway driving",
        qualifiedCategories: {
          connect: createdCategories
            .filter((c) => ["B", "B+E", "C1"].includes(c.name))
            .map((c) => ({ id: c.id })),
        },
        qualifiedTransmissionTypes: {
          connect: [
            { id: manualTransmission.id },
            { id: automaticTransmission.id },
          ],
        },
      },
    }),
    prisma.instructor.create({
      data: {
        userId: instructorUsers[1].id,
        organizationId: orgId,
        instructorLicenseNumber: "INS-002-2024",
        instructorLicenseExpiry: new Date("2026-12-31"),
        employmentType: "FULL_TIME",
        hourlyRate: 42.0,
        maxLessonsPerDay: 8,
        isAvailableForBooking: true,
        specializations:
          "Automatic transmission, City driving, Nervous students",
        qualifiedCategories: {
          connect: createdCategories
            .filter((c) => ["B", "A1", "A2"].includes(c.name))
            .map((c) => ({ id: c.id })),
        },
        qualifiedTransmissionTypes: {
          connect: [
            { id: manualTransmission.id },
            { id: automaticTransmission.id },
          ],
        },
      },
    }),
    prisma.instructor.create({
      data: {
        userId: instructorUsers[2].id,
        organizationId: orgId,
        instructorLicenseNumber: "INS-003-2024",
        instructorLicenseExpiry: new Date("2026-12-31"),
        employmentType: "PART_TIME",
        hourlyRate: 48.0,
        maxLessonsPerDay: 6,
        isAvailableForBooking: true,
        specializations: "Heavy vehicles, Commercial driving",
        qualifiedCategories: {
          connect: createdCategories
            .filter((c) => ["C", "C1", "D", "D1"].includes(c.name))
            .map((c) => ({ id: c.id })),
        },
        qualifiedTransmissionTypes: {
          connect: [{ id: manualTransmission.id }],
        },
      },
    }),
  ]);

  console.log(`✅ Created ${instructors.length} instructors`);

  // 6. Create Sample Students
  console.log("👨‍🎓 Creating sample students...");
  const studentUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: "alice.smith@email.com",
        organizationId: orgId,
        passwordHash: await bcrypt.hash("student123", 12),
        role: "STUDENT" as any,
        firstName: "Alice",
        lastName: "Smith",
        phoneNumber: "+1-555-0301",
        dateOfBirth: new Date("1998-05-15"),
        address: "123 Main St",
        city: "Springfield",
        postalCode: "12345",
        isEmailVerified: true,
        isApproved: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "bob.wilson@email.com",
        organizationId: orgId,
        passwordHash: await bcrypt.hash("student123", 12),
        role: "STUDENT" as any,
        firstName: "Bob",
        lastName: "Wilson",
        phoneNumber: "+1-555-0302",
        dateOfBirth: new Date("2000-08-22"),
        address: "456 Oak Ave",
        city: "Springfield",
        postalCode: "12346",
        isEmailVerified: true,
        isApproved: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "carol.davis@email.com",
        organizationId: orgId,
        passwordHash: await bcrypt.hash("student123", 12),
        role: "STUDENT" as any,
        firstName: "Carol",
        lastName: "Davis",
        phoneNumber: "+1-555-0303",
        dateOfBirth: new Date("1995-11-10"),
        address: "789 Pine Rd",
        city: "Springfield",
        postalCode: "12347",
        isEmailVerified: true,
        isApproved: true,
      },
    }),
  ]);

  const categoryB = createdCategories.find((c) => c.name === "B");
  const categoryA1 = createdCategories.find((c) => c.name === "A1");

  const students = await Promise.all([
    prisma.student.create({
      data: {
        userId: studentUsers[0].id,
        organizationId: orgId,
        studentNumber: 1,
        studentIdNumber: "STU-001-2024",
        categoryId: categoryB?.id,
        transmissionTypeId: automaticTransmission.id,
        emergencyContactName: "Jane Smith",
        emergencyContactPhone: "+1-555-0401",
        emergencyContactRelationship: "Mother",
        preferredInstructorId: instructors[1].id,
        preferredLessonTime: "afternoon",
        specialRequirements: "Prefers calm driving environments",
      },
    }),
    prisma.student.create({
      data: {
        userId: studentUsers[1].id,
        organizationId: orgId,
        studentNumber: 2,
        studentIdNumber: "STU-002-2024",
        categoryId: categoryB?.id,
        transmissionTypeId: manualTransmission.id,
        emergencyContactName: "Mary Wilson",
        emergencyContactPhone: "+1-555-0402",
        emergencyContactRelationship: "Mother",
        preferredInstructorId: instructors[0].id,
        preferredLessonTime: "morning",
      },
    }),
    prisma.student.create({
      data: {
        userId: studentUsers[2].id,
        organizationId: orgId,
        studentNumber: 3,
        studentIdNumber: "STU-003-2024",
        categoryId: categoryA1?.id,
        transmissionTypeId: manualTransmission.id,
        emergencyContactName: "Robert Davis",
        emergencyContactPhone: "+1-555-0403",
        emergencyContactRelationship: "Father",
        preferredInstructorId: instructors[1].id,
        preferredLessonTime: "evening",
        specialRequirements: "Experienced with motorcycles",
      },
    }),
  ]);

  console.log(`✅ Created ${students.length} students`);

  // 7. Create Sample Vehicles
  console.log("🚗 Creating sample vehicles...");
  const vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        registrationNumber: "DS-001-2024",
        organizationId: orgId,
        make: "Toyota",
        model: "Corolla",
        year: 2023,
        color: "White",
        vin: "JTD3232P1S2123456",
        categoryId: categoryB?.id,
        transmissionTypeId: automaticTransmission.id,
        status: "AVAILABLE",
        currentMileage: 15000,
        serviceIntervalKm: 10000,
        nextServiceDate: new Date("2024-12-01"),
        insurancePolicyNumber: "POL-2024-001",
        insuranceExpiryDate: new Date("2024-12-31"),
        insuranceCompany: "SafeDrive Insurance",
        hasDualControls: true,
        hasDashcam: true,
        fuelType: "PETROL",
      },
    }),
    prisma.vehicle.create({
      data: {
        registrationNumber: "DS-002-2024",
        organizationId: orgId,
        make: "Honda",
        model: "Civic",
        year: 2022,
        color: "Blue",
        vin: "JHK3232P1S2654321",
        categoryId: categoryB?.id,
        transmissionTypeId: manualTransmission.id,
        status: "AVAILABLE",
        currentMileage: 22000,
        serviceIntervalKm: 10000,
        nextServiceDate: new Date("2024-11-15"),
        insurancePolicyNumber: "POL-2024-002",
        insuranceExpiryDate: new Date("2024-12-31"),
        insuranceCompany: "SafeDrive Insurance",
        hasDualControls: true,
        hasDashcam: false,
        fuelType: "PETROL",
      },
    }),
    prisma.vehicle.create({
      data: {
        registrationNumber: "DS-003-2024",
        organizationId: orgId,
        make: "Yamaha",
        model: "YBR 125",
        year: 2023,
        color: "Black",
        vin: "YAM123456789012345",
        categoryId: categoryA1?.id,
        transmissionTypeId: manualTransmission.id,
        status: "AVAILABLE",
        currentMileage: 5000,
        serviceIntervalKm: 5000,
        nextServiceDate: new Date("2024-10-30"),
        insurancePolicyNumber: "POL-2024-003",
        insuranceExpiryDate: new Date("2024-12-31"),
        insuranceCompany: "MotoBike Insurance",
        hasDualControls: false,
        hasDashcam: false,
        fuelType: "PETROL",
      },
    }),
    prisma.vehicle.create({
      data: {
        registrationNumber: "DS-004-2024",
        organizationId: orgId,
        make: "Volkswagen",
        model: "Golf",
        year: 2023,
        color: "Silver",
        vin: "VWG3232P1S2987654",
        categoryId: categoryB?.id,
        transmissionTypeId: manualTransmission.id,
        status: "AVAILABLE",
        currentMileage: 12000,
        serviceIntervalKm: 15000,
        nextServiceDate: new Date("2024-12-15"),
        insurancePolicyNumber: "POL-2024-004",
        insuranceExpiryDate: new Date("2024-12-31"),
        insuranceCompany: "SafeDrive Insurance",
        hasDualControls: true,
        hasDashcam: true,
        fuelType: "DIESEL",
      },
    }),
    prisma.vehicle.create({
      data: {
        registrationNumber: "DS-005-2024",
        organizationId: orgId,
        make: "Nissan",
        model: "Leaf",
        year: 2023,
        color: "Green",
        vin: "NIS3232P1S2147258",
        categoryId: categoryB?.id,
        transmissionTypeId: automaticTransmission.id,
        status: "AVAILABLE",
        currentMileage: 8000,
        serviceIntervalKm: 20000,
        nextServiceDate: new Date("2025-01-30"),
        insurancePolicyNumber: "POL-2024-005",
        insuranceExpiryDate: new Date("2024-12-31"),
        insuranceCompany: "EcoDrive Insurance",
        hasDualControls: true,
        hasDashcam: true,
        fuelType: "ELECTRIC",
      },
    }),
  ]);

  console.log(`✅ Created ${vehicles.length} vehicles`);

  // 8. Create System Settings
  console.log("⚙️ Creating system settings...");
  const systemSettings = await Promise.all([
    prisma.systemSetting.create({
      data: {
        settingKey: "business_name",
        settingValue: "Driving School Academy",
        settingType: "STRING",
        description: "School name",
        category: "general",
        isPublic: true,
      },
    }),
    prisma.systemSetting.create({
      data: {
        settingKey: "business_email",
        settingValue: "info@elitedrivingacademy.com",
        settingType: "STRING",
        description: "Primary contact email",
        category: "general",
        isPublic: true,
      },
    }),
    prisma.systemSetting.create({
      data: {
        settingKey: "business_phone",
        settingValue: "+1-555-DRIVE-NOW",
        settingType: "STRING",
        description: "Primary contact phone",
        category: "general",
        isPublic: true,
      },
    }),
    prisma.systemSetting.create({
      data: {
        settingKey: "default_lesson_duration",
        settingValue: "60",
        settingType: "INTEGER",
        description: "Default lesson duration in minutes",
        category: "lessons",
        isPublic: true,
      },
    }),
    prisma.systemSetting.create({
      data: {
        settingKey: "lesson_cancellation_hours",
        settingValue: "24",
        settingType: "INTEGER",
        description: "Minimum hours before lesson to cancel",
        category: "lessons",
        isPublic: true,
      },
    }),
    prisma.systemSetting.create({
      data: {
        settingKey: "auto_approve_lessons",
        settingValue: "false",
        settingType: "BOOLEAN",
        description: "Auto-approve lesson requests",
        category: "lessons",
        isPublic: false,
      },
    }),
    prisma.systemSetting.create({
      data: {
        settingKey: "max_daily_lessons_per_student",
        settingValue: "3",
        settingType: "INTEGER",
        description: "Maximum lessons per student per day",
        category: "lessons",
        isPublic: true,
      },
    }),
    prisma.systemSetting.create({
      data: {
        settingKey: "theory_exam_pass_score",
        settingValue: "80",
        settingType: "DECIMAL",
        description: "Minimum score to pass theory exam (%)",
        category: "exams",
        isPublic: true,
      },
    }),
    prisma.systemSetting.create({
      data: {
        settingKey: "practical_exam_max_attempts",
        settingValue: "3",
        settingType: "INTEGER",
        description: "Maximum practical exam attempts",
        category: "exams",
        isPublic: true,
      },
    }),
    prisma.systemSetting.create({
      data: {
        settingKey: "email_notifications_enabled",
        settingValue: "true",
        settingType: "BOOLEAN",
        description: "Enable email notifications",
        category: "notifications",
        isPublic: false,
      },
    }),
    prisma.systemSetting.create({
      data: {
        settingKey: "booking_advance_days",
        settingValue: "30",
        settingType: "INTEGER",
        description: "Days in advance for booking",
        category: "lessons",
        isPublic: true,
      },
    }),
  ]);

  console.log(`✅ Created ${systemSettings.length} system settings`);

  // Backfill org scope for seeded rows (keeps seed simpler/less error-prone)
  await prisma.instructor.updateMany({ data: { organizationId: orgId } });
  await prisma.student.updateMany({ data: { organizationId: orgId } });
  await prisma.vehicle.updateMany({ data: { organizationId: orgId } });
  await prisma.systemSetting.updateMany({ data: { organizationId: orgId } });

  // 9. Create Sample Lesson Counter for students
  console.log("📊 Creating lesson counters...");
  const lessonCounters = await Promise.all([
    prisma.lessonCounter.create({
      data: {
        studentId: students[0].id,
        categoryId: categoryB?.id || 1,
        totalDrivingLessons: 8,
        completedDrivingLessons: 5,
        totalTheoryLessons: 12,
        completedTheoryLessons: 10,
        totalDrivingHours: 5.0,
        requiredDrivingHours: 30.0,
        progressPercentage: 35.5,
      },
    }),
    prisma.lessonCounter.create({
      data: {
        studentId: students[1].id,
        categoryId: categoryB?.id || 1,
        totalDrivingLessons: 15,
        completedDrivingLessons: 12,
        totalTheoryLessons: 20,
        completedTheoryLessons: 18,
        totalDrivingHours: 12.0,
        requiredDrivingHours: 30.0,
        progressPercentage: 65.5,
      },
    }),
    prisma.lessonCounter.create({
      data: {
        studentId: students[2].id,
        categoryId: categoryA1?.id || 2,
        totalDrivingLessons: 3,
        completedDrivingLessons: 2,
        totalTheoryLessons: 8,
        completedTheoryLessons: 6,
        totalDrivingHours: 2.0,
        requiredDrivingHours: 15.0,
        progressPercentage: 20.0,
      },
    }),
  ]);

  console.log(`✅ Created ${lessonCounters.length} lesson counters`);

  // Summary
  console.log(`
🎉 Database seeding completed successfully!

📊 Summary:
  - Transmission Types: 2
  - Categories: ${createdCategories.length}
  - Users: ${instructorUsers.length + studentUsers.length + 2} (including Super Admin & Test User)
  - Instructors: ${instructors.length}
  - Students: ${students.length}
  - Vehicles: ${vehicles.length}
  - System Settings: ${systemSettings.length}
  - Lesson Counters: ${lessonCounters.length}

👑 Super Admin Credentials:
  Email: conquistadora@drivingschool.com
  Password: Conquistadora!

👤 Test User Credentials:
  Email: john@doe.com
  Password: johndoe123

🧑‍🏫 Sample Instructor Credentials:
  Email: michael.johnson@drivingschool.com
  Password: instructor123

👨‍🎓 Sample Student Credentials:
  Email: alice.smith@email.com
  Password: student123

✅ Ready to start the application!
  `);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seeding failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
