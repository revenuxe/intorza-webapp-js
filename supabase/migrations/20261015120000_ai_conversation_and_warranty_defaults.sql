begin;

-- Private source turns are kept for the account owner. They are deliberately
-- separate from the global learning corpus below: customer names, addresses,
-- rates and other quotation details must never become training data by default.
create table if not exists public.quotation_ai_turns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null,
  language text not null check (language in ('en-IN', 'hi-IN', 'hi-IN-native')),
  transcript text not null check (char_length(transcript) <= 3000),
  assistant_reply text not null check (char_length(assistant_reply) <= 1500),
  focus text,
  changed boolean not null default false,
  outcome jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists quotation_ai_turns_user_created_idx on public.quotation_ai_turns(user_id, created_at desc);
alter table public.quotation_ai_turns enable row level security;
create policy "Users manage own quotation AI source turns" on public.quotation_ai_turns
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- One global, service-role-only dataset for reviewed examples. A redaction and
-- approval job may copy a useful pattern here, replacing personal data with
-- placeholders. No browser role receives any privilege on this table.
create table if not exists public.quotation_ai_learning_examples (
  id uuid primary key default gen_random_uuid(),
  source_turn_id uuid unique references public.quotation_ai_turns(id) on delete set null,
  language text not null check (language in ('en-IN', 'hi-IN', 'hi-IN-native')),
  redacted_input text not null check (char_length(redacted_input) <= 3000),
  expected_output jsonb not null,
  quality smallint not null default 0 check (quality between 0 and 100),
  approval_state text not null default 'pending' check (approval_state in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  approved_at timestamptz
);
alter table public.quotation_ai_learning_examples enable row level security;
revoke all on table public.quotation_ai_learning_examples from anon, authenticated;
create index if not exists quotation_ai_learning_examples_approved_idx on public.quotation_ai_learning_examples(approval_state, quality desc, created_at desc);

alter table public.warranty_templates add column if not exists warranty_years numeric(6,2);
alter table public.warranty_templates add constraint warranty_templates_years_valid
  check (warranty_years is null or (warranty_years > 0 and warranty_years <= 100)) not valid;
commit;
