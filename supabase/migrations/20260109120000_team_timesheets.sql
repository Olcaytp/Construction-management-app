-- Team timesheets (puantaj) table for tracking work hours, overtime, leave and payable amounts
CREATE TABLE public.team_timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  hours_worked NUMERIC(6,2) NOT NULL DEFAULT 0,
  overtime_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  leave_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  leave_type TEXT,
  hourly_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
  payable_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'approved',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Basic indexes
CREATE INDEX team_timesheets_user_id_idx ON public.team_timesheets(user_id);
CREATE INDEX team_timesheets_member_id_idx ON public.team_timesheets(team_member_id);
CREATE INDEX team_timesheets_work_date_idx ON public.team_timesheets(work_date);

-- RLS
ALTER TABLE public.team_timesheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own timesheets"
  ON public.team_timesheets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own timesheets"
  ON public.team_timesheets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timesheets"
  ON public.team_timesheets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timesheets"
  ON public.team_timesheets FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at trigger
CREATE TRIGGER update_team_timesheets_updated_at
  BEFORE UPDATE ON public.team_timesheets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
