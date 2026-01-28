# Edupia Helper

A comprehensive helper tool designed for Edupia teachers to generate quick feedback, manage student groups, track lesson progress, and organize schedules. This application features a modern, glassmorphic UI and robust authentication powered by Supabase.

## 🚀 Features

*   **Authentication**: Secure Sign In and Sign Up system using Supabase Auth (Email/Password).
*   **User Profiles**: Automatically creates user profiles with Full Name upon registration.
*   **Classes Management**: Organize students into classes for easier management.
*   **Records Tracking**: Keep track of student performance and lesson records with multi-selection capabilities.
*   **Timetable & Calendar**: View and manage schedules with Calendar Sync integration.
*   **Protected Routes**: Secure access to protected pages (`/students`, `/lesson`, `/classes`, `/records`), ensuring only authenticated users can access them.
*   **Modern UI**: Beautiful Glassmorphism design system using Tailwind CSS and Framer Motion.
*   **Dark Mode**: Optimized dark mode interface by default.
*   **Vietnamese Support**: Full Vietnamese language support for UI and feedback generation.

## 🛠️ Tech Stack

*   **Framework**: [Next.js 16+](https://nextjs.org/) (App Router)
*   **Language**: TypeScript
*   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
*   **Backend/Auth**: [Supabase](https://supabase.com/)
*   **Database Management**: Supabase CLI
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

### 4. Database Setup (Supabase CLI)

This project uses Supabase CLI for type generation and database interactions.

1.  **Login to Supabase**:
    ```bash
    npx supabase login
    ```
2.  **Link Project**:
    ```bash
    npx supabase link --project-ref your-project-id
    ```
3.  **Generate Types**:
    ```bash
    npm run update-types
    ```

### 5. Run the application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📂 Project Structure

*   `app/`: App Router pages and layouts.
    *   `classes/`: Class management.
    *   `lesson/`: Lesson feedback management.
    *   `login/` & `signup/`: Authentication pages.
    *   `records/`: Student record tracking.
    *   `students/`: Student management.
    *   `timetable/`: Schedule and calendar views.
*   `components/`: Reusable React components (`Auth`, `Sidebar`, `HomeMenu`, etc.).
*   `supabase/`: Supabase configuration and migrations.
*   `types/`: TypeScript definitions (auto-generated via `update-types`).
*   `utils/supabase/`: Supabase client configuration for Client, Server, and Middleware.

## 📄 License

This project is for educational and internal use.
