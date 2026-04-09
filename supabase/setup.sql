-- Supabase Setup SQL
-- Run this in the Supabase SQL Editor after creating your project

-- ============================================
-- 1. Enable pgvector extension
-- ============================================
create extension if not exists vector with schema public;

-- ============================================
-- 2. Create a trigger to sync auth.users to public.User
-- This automatically creates a User record when someone signs up
-- ============================================

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public."User" (id, email, name, image, "emailVerified", "createdAt", "updatedAt")
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    new.email_confirmed_at is not null,
    now(),
    now()
  );
  return new;
end;
$$;

-- Trigger to call the function on user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to handle user updates (optional - sync profile changes)
create or replace function public.handle_user_update()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public."User"
  set
    email = new.email,
    name = coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', public."User".name),
    image = coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', public."User".image),
    "emailVerified" = new.email_confirmed_at is not null,
    "updatedAt" = now()
  where id = new.id;
  return new;
end;
$$;

-- Trigger to call the function on user update
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_user_update();

-- ============================================
-- 3. Create storage bucket for resumes
-- ============================================

-- Create the resumes bucket as private. The app uses authenticated access and
-- service-role uploads rather than public file URLs.
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

-- ============================================
-- 4. Storage policies for resumes bucket
-- ============================================

-- Allow authenticated users to upload files to their own folder
create policy "Users can upload their own resumes"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'resumes' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own resumes
create policy "Users can read their own resumes"
on storage.objects for select
to authenticated
using (
  bucket_id = 'resumes' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own resumes
create policy "Users can delete their own resumes"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'resumes' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- 5. Vector similarity search function (optional)
-- ============================================

-- Function to find similar jobs based on resume embedding
create or replace function match_jobs_by_embedding(
  query_embedding vector(768),
  match_threshold float default 0.5,
  match_count int default 20
)
returns table (
  id text,
  title text,
  company text,
  location text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    j.id,
    j.title,
    j.company,
    j.location,
    1 - (j.embedding <=> query_embedding) as similarity
  from "Job" j
  where j.embedding is not null
    and j."isActive" = true
    and 1 - (j.embedding <=> query_embedding) > match_threshold
  order by j.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ============================================
-- Notes:
-- ============================================
-- 1. Run `npx prisma migrate dev` after setting up Supabase to create tables
-- 2. The trigger will auto-create User records when users sign up
-- 3. Configure OAuth providers (Google, GitHub) in Supabase Dashboard → Auth → Providers
-- 4. Disable email confirmation in Supabase Dashboard → Auth → Settings if desired
