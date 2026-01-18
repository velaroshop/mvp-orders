import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration(fileName: string) {
  const migrationPath = path.join(process.cwd(), 'migrations', fileName);
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log(`Running migration: ${fileName}`);

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  console.log('Migration completed successfully');
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: tsx scripts/run-migration.ts <migration-file>');
  process.exit(1);
}

runMigration(migrationFile);
