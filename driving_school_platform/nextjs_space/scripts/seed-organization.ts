/**
 * Seed Script: Organization Setup
 *
 * Sets up the default organization and links existing users
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { executeSqlBackfillNullOrganizationId } from "@/lib/tenant-operational-organization-id-sql";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting organization setup...\n");

  try {
    // Check if an organization already exists
    const existingOrg = await prisma.organization.findFirst();

    if (existingOrg) {
      console.log("✅ Organization already exists:", existingOrg.name);
      console.log("   Organization ID:", existingOrg.id);
      console.log("   Subscription Tier:", existingOrg.subscriptionTier);
      console.log("   Status:", existingOrg.subscriptionStatus);

      // Link all users without an organization to this one
      const usersWithoutOrg = await prisma.user.findMany({
        where: { organizationId: null },
      });

      if (usersWithoutOrg.length > 0) {
        console.log(
          `\n📎 Linking ${usersWithoutOrg.length} users to organization...`,
        );

        await prisma.user.updateMany({
          where: { organizationId: null },
          data: { organizationId: existingOrg.id },
        });

        await executeSqlBackfillNullOrganizationId(
          prisma,
          "student",
          existingOrg.id,
        );
        await executeSqlBackfillNullOrganizationId(
          prisma,
          "instructor",
          existingOrg.id,
        );
        await executeSqlBackfillNullOrganizationId(
          prisma,
          "vehicle",
          existingOrg.id,
        );
        await executeSqlBackfillNullOrganizationId(
          prisma,
          "lesson",
          existingOrg.id,
        );
        await executeSqlBackfillNullOrganizationId(
          prisma,
          "exam",
          existingOrg.id,
        );
        await executeSqlBackfillNullOrganizationId(
          prisma,
          "lessonRequest",
          existingOrg.id,
        );

        console.log("✅ Users linked successfully");
      }

      return;
    }

    // Create the default organization
    console.log("📝 Creating default organization...");

    const organization = await prisma.organization.create({
      data: {
        name: "Driving School Academy",
        email: "admin@elitedrivingacademy.com",
        phoneNumber: "+1234567890",
        address: "123 Main Street",
        city: "Your City",
        postalCode: "12345",
        subscriptionTier: "BASE",
        subscriptionStatus: "ACTIVE",
        primaryColor: "#2563eb",
        secondaryColor: "#dc2626",
      },
    });

    console.log("✅ Organization created successfully");
    console.log("   Organization ID:", organization.id);
    console.log("   Name:", organization.name);

    // Link all existing users to this organization
    console.log("\n📎 Linking all users to organization...");

    await prisma.user.updateMany({
      where: { organizationId: null },
      data: { organizationId: organization.id },
    });

    await executeSqlBackfillNullOrganizationId(
      prisma,
      "student",
      organization.id,
    );
    await executeSqlBackfillNullOrganizationId(
      prisma,
      "instructor",
      organization.id,
    );
    await executeSqlBackfillNullOrganizationId(
      prisma,
      "vehicle",
      organization.id,
    );
    await executeSqlBackfillNullOrganizationId(
      prisma,
      "lesson",
      organization.id,
    );
    await executeSqlBackfillNullOrganizationId(prisma, "exam", organization.id);
    await executeSqlBackfillNullOrganizationId(
      prisma,
      "lessonRequest",
      organization.id,
    );

    console.log("✅ Users linked successfully");

    // Create default features (all disabled by default)
    console.log("\n🔧 Setting up feature flags...");

    const featureKeys = [
      "STUDENT_ACCESS",
      "VEHICLE_MANAGEMENT",
      "SCREENSHOT_PROTECTION",
      "ADVANCED_REPORTING",
      "SMS_NOTIFICATIONS",
      "MOBILE_APP",
      "PAYMENT_INTEGRATION",
      "MULTI_LANGUAGE",
    ];

    for (const featureKey of featureKeys) {
      await prisma.organizationFeature.upsert({
        where: {
          organizationId_featureKey: {
            organizationId: organization.id,
            featureKey,
          },
        },
        create: {
          organizationId: organization.id,
          featureKey,
          isEnabled: false,
        },
        update: {},
      });
    }

    console.log("✅ Feature flags created");

    // Create a sample license key for testing
    console.log("\n🔑 Creating sample license key...");

    const licenseKey = await prisma.licenseKey.create({
      data: {
        organizationId: organization.id,
        key: `LIC-${Date.now()}-SAMPLE`,
        featureKeys: ["STUDENT_ACCESS", "VEHICLE_MANAGEMENT"],
        isUsed: false,
        notes: "Sample license key for testing",
      },
    });

    console.log("✅ Sample license key created");
    console.log("   License Key:", licenseKey.key);
    console.log("   Features:", licenseKey.featureKeys.join(", "));
    console.log(
      "\n💡 You can activate this license key in the admin panel to unlock features",
    );

    console.log("\n🎉 Organization setup completed successfully!\n");
  } catch (error) {
    console.error("❌ Error setting up organization:", error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
