-- Create the classes table
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    fixed_class_id TEXT NOT NULL,
    grade INTEGER,
    level TEXT,
    state TEXT DEFAULT 'Đang dạy' CHECK (state IN ('Đang dạy', 'Kết thúc')),
    num_students INTEGER DEFAULT 0,
    students JSONB DEFAULT '[]'::jsonb,
    schedule JSONB, -- Array of weekdays e.g. ["T2", "T5"]
    time TEXT -- e.g. "19h30"
);

-- Enable Row Level Security
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see and manage only their own classes
CREATE POLICY "Users can manage their own classes" ON public.classes
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS classes_user_id_idx ON public.classes(user_id);
