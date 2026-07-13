import { getDatabase } from './index.js';
import { generateApiKey } from '../services/api-key.js';

async function seed() {
  console.log('Seeding database...\n');

  await getDatabase();

  // Generate a default API key
  const { key, prefix } = await generateApiKey('Default API Key');

  console.log('Generated API key:');
  console.log('==================');
  console.log(`Key: ${key}`);
  console.log(`Prefix: ${prefix}`);
  console.log('\nUse this key in the Authorization header:');
  console.log(`Authorization: Bearer ${key}`);
  console.log('\nOr set it in your .env file as ANYARTIFACT_API_KEY');

  process.exit(0);
}

seed();
