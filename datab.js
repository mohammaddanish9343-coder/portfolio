const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const tables = {
  users: process.env.SUPABASE_USERS_TABLE || 'users'
};

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY), or NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY.'
  );
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const verifyTable = async (tableName) => {
  const { error } = await supabase.from(tableName).select('id').limit(1);
  if (error) {
    throw new Error(
      `Supabase table check failed for "${tableName}": ${error.message}`
    );
  }
};

const initializeDatabase = async () => {
  await verifyTable(tables.users);
  console.log('Connected to Supabase and verified required tables');
};

const initPromise = initializeDatabase();

module.exports = { supabase, initPromise, tables };
