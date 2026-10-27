-- KITH-2 host-agent workspace: archive threads, drafts, chat, labels, feedback.
-- Idempotent: safe to run more than once.

DO $$ BEGIN
  CREATE TYPE host_draft_status AS ENUM ('pending', 'approved', 'sent', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE host_thread_source AS ENUM ('archive', 'live');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE host_message_role AS ENUM ('guest', 'host', 'user', 'assistant', 'system');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE host_example_label AS ENUM ('yes', 'no', 'screening', 'stay');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE host_draft_event_action AS ENUM ('created', 'approved', 'edited', 'rejected', 'sent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS host_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id),
  stay_id uuid REFERENCES stays(id),
  source host_thread_source NOT NULL DEFAULT 'archive',
  title text NOT NULL,
  guest_name text,
  channel text NOT NULL DEFAULT 'paste',
  imported_by_user_id uuid REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS host_threads_property_id_idx ON host_threads (property_id);
CREATE INDEX IF NOT EXISTS host_threads_source_idx ON host_threads (source);
CREATE INDEX IF NOT EXISTS host_threads_channel_idx ON host_threads (channel);

CREATE TABLE IF NOT EXISTS host_thread_labels (
  thread_id uuid NOT NULL REFERENCES host_threads(id) ON DELETE CASCADE,
  label host_example_label NOT NULL,
  PRIMARY KEY (thread_id, label)
);

CREATE INDEX IF NOT EXISTS host_thread_labels_label_idx ON host_thread_labels (label);

CREATE TABLE IF NOT EXISTS host_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES host_threads(id) ON DELETE SET NULL,
  property_id uuid REFERENCES properties(id),
  template_id uuid REFERENCES message_templates(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  status host_draft_status NOT NULL DEFAULT 'pending',
  is_safe_template boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'chat',
  retrieved_thread_ids jsonb,
  created_by_user_id uuid NOT NULL REFERENCES users(id),
  reviewed_by_user_id uuid REFERENCES users(id),
  reviewed_at timestamp,
  feedback_note text,
  original_body text,
  sent_at timestamp,
  send_note text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS host_drafts_status_idx ON host_drafts (status);
CREATE INDEX IF NOT EXISTS host_drafts_thread_id_idx ON host_drafts (thread_id);
CREATE INDEX IF NOT EXISTS host_drafts_created_at_idx ON host_drafts (created_at);

CREATE TABLE IF NOT EXISTS host_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES host_threads(id) ON DELETE CASCADE,
  draft_id uuid REFERENCES host_drafts(id) ON DELETE SET NULL,
  role host_message_role NOT NULL,
  body text NOT NULL,
  occurred_at timestamp NOT NULL DEFAULT now(),
  created_by_user_id uuid REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS host_messages_thread_id_idx ON host_messages (thread_id);
CREATE INDEX IF NOT EXISTS host_messages_draft_id_idx ON host_messages (draft_id);
CREATE INDEX IF NOT EXISTS host_messages_occurred_at_idx ON host_messages (occurred_at);

CREATE TABLE IF NOT EXISTS host_draft_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES host_drafts(id) ON DELETE CASCADE,
  action host_draft_event_action NOT NULL,
  note text,
  body_snapshot text,
  actor_user_id uuid REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS host_draft_events_draft_id_idx ON host_draft_events (draft_id);
CREATE INDEX IF NOT EXISTS host_draft_events_action_idx ON host_draft_events (action);
