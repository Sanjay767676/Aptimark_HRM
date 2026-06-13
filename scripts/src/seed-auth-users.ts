import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const users = [
  {
    email: 'aptimark.admin@gmail.com',
    password: 'Admin@123456!',
    role: 'admin',
  },
  {
    email: 'aptimark.hr@gmail.com',
    password: 'Hr@123456!',
    role: 'hr',
  },
];

async function seedUsers(): Promise<void> {
  console.log('Creating Supabase auth users...\n');

  for (const user of users) {
    const { data, error } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
      options: {
        data: { role: user.role },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        console.log(`⚠️  ${user.email} already exists — skipping`);
      } else {
        console.error(`✗  ${user.email} — ${error.message}`);
      }
    } else if (data.user) {
      console.log(`✓  Created ${user.role.toUpperCase()} user: ${user.email}`);
      console.log(`   Password: ${user.password}`);
    }
  }

  console.log('\nDone! Use the credentials above to log in.');
  console.log('Note: If email confirmation is required in Supabase, disable it under');
  console.log('Authentication → Providers → Email → "Confirm email" toggle.');
}

seedUsers().catch(console.error);
