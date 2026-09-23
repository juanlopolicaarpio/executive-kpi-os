-- Telegram Sessions table
-- Tracks linking codes and bot conversation state

CREATE TABLE telegram_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  telegram_id BIGINT UNIQUE,
  linking_code TEXT UNIQUE,
  linking_code_expires_at TIMESTAMPTZ,
  linked_at TIMESTAMPTZ,
  awaiting_plan_for_kpi_id UUID REFERENCES kpis(id),
  last_message_at TIMESTAMPTZ,
  conversation_state TEXT NOT NULL DEFAULT 'idle'
    CHECK (conversation_state IN ('idle', 'awaiting-plan', 'awaiting-confirmation', 'chat')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_telegram_sessions_user ON telegram_sessions(user_id);
CREATE INDEX idx_telegram_sessions_telegram_id ON telegram_sessions(telegram_id);
CREATE INDEX idx_telegram_sessions_linking_code ON telegram_sessions(linking_code)
  WHERE linking_code IS NOT NULL;

-- Enable RLS
ALTER TABLE telegram_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own session
CREATE POLICY "telegram_sessions_read_own" ON telegram_sessions FOR SELECT USING (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  OR (SELECT role FROM users WHERE auth_id = auth.uid()) IN ('ceo', 'econs-manager')
);

CREATE POLICY "telegram_sessions_insert_own" ON telegram_sessions FOR INSERT WITH CHECK (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);

CREATE POLICY "telegram_sessions_update_own" ON telegram_sessions FOR UPDATE USING (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);
