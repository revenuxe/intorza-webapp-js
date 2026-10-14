import fs from 'node:fs';

// Build a rollback-only check. Execute the printed CLI command separately.
const migrations = process.argv.includes('--current') ? [] : process.argv.includes('--pending-abuse')
  ? ['20261014123000_reduce_api_privileges_and_upload_abuse.sql']
  : ['20261014120000_secure_profile_access.sql', '20261014121000_secure_room_photo_objects.sql', '20261014123000_reduce_api_privileges_and_upload_abuse.sql', '20261014124000_verified_team_join_request.sql', '20261014125000_atomic_verified_payment_activation.sql'];
const ddl = migrations.map(name => fs.readFileSync(`supabase/migrations/${name}`, 'utf8').replace(/^begin;\s*/i, '').replace(/commit;\s*$/i, '')).join('\n');
const checks = ['profile-security.sql', 'room-photo-security.sql', 'api-abuse-security.sql', 'verified-team-join.sql', 'verified-payment-activation.sql'].map(name => fs.readFileSync(`supabase/checks/${name}`, 'utf8')).join('\n');
fs.writeFileSync('supabase/checks/.security-preview.sql', 'begin;\n' + ddl + '\n' + checks + '\nrollback;\n');
console.log('Prepared rollback-only DDL and synthetic tenant tests. Run:');
console.log('npx --no-install supabase db query --linked --file supabase/checks/.security-preview.sql');
