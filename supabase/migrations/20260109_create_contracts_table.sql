-- Create contracts table
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  contractor_name TEXT,
  contractor_phone TEXT,
  contractor_address TEXT,
  contract_date DATE DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own contracts"
ON public.contracts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contracts"
ON public.contracts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contracts"
ON public.contracts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contracts"
ON public.contracts
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX contracts_user_id_idx ON public.contracts(user_id);
CREATE INDEX contracts_project_id_idx ON public.contracts(project_id);
CREATE INDEX contracts_created_at_idx ON public.contracts(created_at DESC);
