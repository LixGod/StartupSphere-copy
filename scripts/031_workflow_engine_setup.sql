-- Create workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- e.g., 'new_lead', 'invoice_overdue', 'inventory_low'
  trigger_config JSONB DEFAULT '{}',
  steps JSONB DEFAULT '[]', -- Array of actions: { type: 'send_whatsapp', template: '...', delay: 0 }
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their own workflows"
  ON workflows FOR ALL
  TO authenticated
  USING (owner_id = auth.uid());

-- Create workflow logs table for audit
CREATE TABLE IF NOT EXISTS workflow_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL, -- 'success', 'failed'
  execution_details JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE workflow_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their own workflow logs"
  ON workflow_logs FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Add trigger to update updated_at
CREATE TRIGGER update_workflows_updated_at
BEFORE UPDATE ON workflows
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
