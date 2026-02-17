create table if not exists public.analysis_results (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    lead_id uuid references public.leads(id),
    result jsonb not null
);

-- Enable RLS
alter table public.analysis_results enable row level security;

-- Create policy to allow anyone (anon) to insert analysis results (needed for the flow)
-- Ideally this should be more restricted, but for now we follow the pattern of other public tables if any.
-- Actually, since Edge Functions will use Service Role to write/read, we might not need public RLS policies if only EF accesses it.
-- But if we want to associate with a lead later, good to have.
-- Let's just enable RLS and assume Service Role bypasses it.

-- Policy for Service Role (implicit, but good to be explicit if using user client)
-- for now, we leave standard RLS enabled, so only Service Role can access unless we add policies.
