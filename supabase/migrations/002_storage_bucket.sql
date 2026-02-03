-- Create storage bucket for drops
-- Run this in Supabase SQL Editor after 001_initial_schema.sql

-- Create the drops bucket (public for reading)
INSERT INTO storage.buckets (id, name, public)
VALUES ('drops', 'drops', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can view files in the drops bucket
CREATE POLICY "Public read access for drops"
ON storage.objects FOR SELECT
USING (bucket_id = 'drops');

-- Policy: Only service role can upload (our API handles auth)
CREATE POLICY "Service role can upload to drops"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'drops');

-- Policy: Only service role can delete
CREATE POLICY "Service role can delete from drops"
ON storage.objects FOR DELETE
USING (bucket_id = 'drops');
