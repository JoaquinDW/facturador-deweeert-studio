CREATE TABLE IF NOT EXISTS facturador_state (
  key text PRIMARY KEY,
  data jsonb NOT NULL,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
