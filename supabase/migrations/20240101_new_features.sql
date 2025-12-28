-- 1. Audit Logs Table
create table if not exists public.admin_audit_logs (
  id uuid default gen_random_uuid() primary key,
  admin_email text not null,
  action text not null, -- e.g. 'DELETE_USER', 'UPDATE_PROFILE'
  target_resource text, -- e.g. 'clients', 'lawyers'
  target_id text,
  details jsonb,
  created_at timestamptz default now() not null
);

-- 2. Support Tickets Table
create table if not exists public.support_tickets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid, -- Link to auth.users if possible, or just store ID
  user_role text, -- 'client' or 'lawyer'
  subject text not null,
  message text not null,
  status text default 'open', -- 'open', 'resolved', 'closed'
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.admin_audit_logs enable row level security;
alter table public.support_tickets enable row level security;

-- Policies
-- Admins (service role) can do everything.
-- For simulation, we allow public read/insert if needed, but really this is admin only.
create policy "Admins can view all logs" on public.admin_audit_logs for select using (true);
create policy "Admins can insert logs" on public.admin_audit_logs for insert with check (true);

create policy "Users can view own tickets" on public.support_tickets for select using (auth.uid() = user_id);
create policy "Users can insert tickets" on public.support_tickets for insert with check (auth.uid() = user_id);
create policy "Admins can view all tickets" on public.support_tickets for select using (true);
create policy "Admins can update tickets" on public.support_tickets for update using (true);
