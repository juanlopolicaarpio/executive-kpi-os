-- Chat Messages table
-- Persists AI chat history per user session

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL, -- client-generated session identifier
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  kpi_mentions UUID[], -- KPI IDs referenced in this message
  tool_calls JSONB,    -- AI tool call payloads if any
  tokens_used INTEGER,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_user_session ON chat_messages(user_id, session_id, created_at DESC);
CREATE INDEX idx_chat_messages_user_recent ON chat_messages(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can only read their own messages; CEO/Manager can read all
CREATE POLICY "chat_messages_read" ON chat_messages FOR SELECT USING (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  OR (SELECT role FROM users WHERE auth_id = auth.uid()) IN ('ceo', 'econs-manager')
);

-- Users can only insert their own messages
CREATE POLICY "chat_messages_insert" ON chat_messages FOR INSERT WITH CHECK (
  user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
);

-- No UPDATE or DELETE — chat history is immutable
