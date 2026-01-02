# Edupia Helper

A comprehensive helper tool designed for Edupia teachers to generate quick feedback, manage student groups, and track lesson progress. This application features a modern, glassmorphic UI and robust authentication powered by Supabase.

## 🚀 Features

*   **Authentication**: Secure Sign In and Sign Up system using Supabase Auth (Email/Password).
*   **User Profiles**: automatically creates user profiles with Full Name upon registration.
*   **Protected Routes**: Secure access to `/students` and `/lesson` pages, ensuring only authenticated users can access them.
*   **Smart Navigation**: "Login Required" modal for guest users attempting to access protected features.
*   **Modern UI**: Beautiful Glassmorphism design system using Tailwind CSS.
*   **Dark Mode**: Optimized dark mode interface by default.
*   **Vietnamese Support**: Full Vietnamese language support for UI and feedback generation.

## 🛠️ Tech Stack

*   **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
*   **Language**: TypeScript
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Backend/Auth**: [Supabase](https://supabase.com/)
*   **Icons**: Lucide React / Custom SVGs

## 🏁 Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd edupia-helper
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Database Setup (Supabase)

To enable user profiles and authentication features, run the following SQL script in your Supabase SQL Editor. This sets up the `profiles` table and necessary triggers.

```sql
-- 1. CLEANUP (Drop existing objects to avoid conflicts)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.profiles cascade;

-- 2. TABLE SETUP
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone default now(),
  email text,
  full_name text,
  avatar_url text
);

-- 3. PERMISSIONS
alter table public.profiles enable row level security;
grant all on public.profiles to postgres, anon, authenticated, service_role;

-- 4. POLICIES (Permissive for easy setup)
create policy "Enable all access for all users" on public.profiles
  for all using (true) with check (true);

-- 5. TRIGGER FUNCTION
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'User'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
exception
  when others then
    raise warning 'Profile creation failed: %', sqlerrm;
    return new;
end;
$$ language plpgsql security definer;

-- 6. TRIGGER
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

> **Note**: For immediate login after signup, go to **Authentication > Providers > Email** in your Supabase dashboard and disable **Confirm email**.

### 5. Run the application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📂 Project Structure

*   `app/`: App Router pages and layouts.
    *   `login/`: Login page.
    *   `signup/`: Signup page.
    *   `students/`: Student feedback management (Protected).
    *   `lesson/`: Lesson feedback management (Protected).
*   `components/`: Reusable React components (`Auth`, `Sidebar`, `HomeMenu`, etc.).
*   `utils/supabase/`: Supabase client configuration for Client, Server, and Middleware.
*   `middleware.ts`: Functionality to refresh sessions and protect routes (backup security).

## 📄 License

This project is for educational and internal use.
