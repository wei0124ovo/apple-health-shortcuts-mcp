CREATE TABLE IF NOT EXISTS metric_samples (
  metric       TEXT    NOT NULL,
  measured_at  INTEGER NOT NULL,
  local_day    TEXT    NOT NULL,
  value        REAL    NOT NULL,
  unit         TEXT    NOT NULL DEFAULT '',
  source       TEXT    NOT NULL DEFAULT 'apple_shortcuts',
  received_at  INTEGER NOT NULL,
  PRIMARY KEY (metric, measured_at)
);

CREATE INDEX IF NOT EXISTS idx_metric_samples_metric_time
  ON metric_samples(metric, measured_at DESC);

CREATE INDEX IF NOT EXISTS idx_metric_samples_day_metric
  ON metric_samples(local_day, metric);

CREATE TABLE IF NOT EXISTS sleep_nights (
  night_date       TEXT PRIMARY KEY,
  sleep_start      INTEGER NOT NULL,
  sleep_end        INTEGER NOT NULL,
  total_minutes    REAL    NOT NULL,
  core_minutes     REAL    NOT NULL DEFAULT 0,
  deep_minutes     REAL    NOT NULL DEFAULT 0,
  rem_minutes      REAL    NOT NULL DEFAULT 0,
  awake_minutes    REAL    NOT NULL DEFAULT 0,
  segments_json    TEXT    NOT NULL DEFAULT '[]',
  received_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sleep_nights_date
  ON sleep_nights(night_date DESC);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
