-- Add photos column to projects table
ALTER TABLE public.projects 
ADD COLUMN photos text[] DEFAULT '{}';

-- Add payment tracking to team_members table
ALTER TABLE public.team_members
ADD COLUMN total_receivable numeric DEFAULT 0,
ADD COLUMN total_paid numeric DEFAULT 0;

-- Create storage bucket for project photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-photos', 'project-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for project photos
CREATE POLICY "Anyone can view project photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-photos');

CREATE POLICY "Authenticated users can upload project photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own project photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'project-photos'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own project photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-photos'
  AND auth.role() = 'authenticated'
);