-- Create hakkedis (invoices/billing) table
CREATE TABLE IF NOT EXISTS hakkedis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES team_members(id) ON DELETE SET NULL, -- Hangi ustaya/işçiye ait
  work_type TEXT NOT NULL, -- işin türü: "boya", "siva", "dekorasyon", vb.
  work_type_label TEXT NOT NULL, -- Türkçe etiketi
  quantity NUMERIC NOT NULL, -- Yapılan miktar (metraj)
  unit TEXT NOT NULL, -- Birim: "m²", "m³", "adet", "m", "günü", vb.
  unit_price NUMERIC NOT NULL, -- Birim fiyat (₺)
  total_amount NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  description TEXT, -- Ek açıklama
  status TEXT DEFAULT 'pending', -- pending, approved, invoiced
  invoice_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  CONSTRAINT valid_work_type CHECK (work_type IN (
    'boya', 'siva', 'dekorasyon', 'cati', 'doseme', 'cam', 
    'kapi_pencere', 'insaat', 'elektrik', 'tesisata', 'bahce', 'omur_isi'
  ))
);

-- Create indexes
CREATE INDEX idx_hakkedis_user_id ON hakkedis(user_id);
CREATE INDEX idx_hakkedis_project_id ON hakkedis(project_id);
CREATE INDEX idx_hakkedis_status ON hakkedis(status);

-- Enable RLS
ALTER TABLE hakkedis ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view hakkedis for their projects"
  ON hakkedis FOR SELECT
  USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create hakkedis for their projects"
  ON hakkedis FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own hakkedis"
  ON hakkedis FOR UPDATE
  USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own hakkedis"
  ON hakkedis FOR DELETE
  USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Create a view for hakkedis summary per project
CREATE OR REPLACE VIEW hakkedis_summary AS
SELECT 
  project_id,
  COUNT(*) as total_items,
  SUM(total_amount) FILTER (WHERE status = 'pending') as pending_amount,
  SUM(total_amount) FILTER (WHERE status = 'approved') as approved_amount,
  SUM(total_amount) FILTER (WHERE status = 'invoiced') as invoiced_amount,
  SUM(total_amount) as total_amount
FROM hakkedis
GROUP BY project_id;
