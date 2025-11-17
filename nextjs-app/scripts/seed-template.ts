/**
 * Seed Default Template Script
 *
 * Creates the default NFPA 1561 Radio Communications Compliance template
 * if it doesn't already exist.
 */

import { templateService } from '../src/lib/services/templateService';
import { prisma } from '../src/lib/db';

async function main() {
  console.log('🌱 Seeding default template...\n');

  try {
    // Check existing templates
    const existingTemplates = await prisma.template.findMany({
      select: { id: true, name: true, isActive: true },
    });

    console.log(`Found ${existingTemplates.length} existing template(s):`);
    existingTemplates.forEach((t) => {
      console.log(`  - ${t.name} (ID: ${t.id}, Active: ${t.isActive})`);
    });
    console.log();

    // Seed default template
    const template = await templateService.seedDefaultTemplates();

    console.log('✅ Default template seeded successfully!\n');
    console.log(`Template Details:`);
    console.log(`  ID: ${template.id}`);
    console.log(`  Name: ${template.name}`);
    console.log(`  Source: ${template.source}`);
    console.log(`  Active: ${template.isActive}`);

    const categories = template.categories as any[];
    console.log(`  Categories: ${categories.length}`);
    categories.forEach((cat: any) => {
      console.log(`    - ${cat.name} (weight: ${cat.weight})`);
    });

    console.log('\n✨ Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
