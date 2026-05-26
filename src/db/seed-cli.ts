import 'dotenv/config';
import { seedNewUser } from './seed';

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: npm run db:seed <clerkUserId>');
  process.exit(1);
}

seedNewUser(userId)
  .then(() => {
    console.log(`Seeded user ${userId}`);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
