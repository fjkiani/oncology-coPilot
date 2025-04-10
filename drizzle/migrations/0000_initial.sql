-- Create Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR NOT NULL,
  age INTEGER NOT NULL,
  location VARCHAR NOT NULL,
  folders TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  treatment_counts INTEGER NOT NULL,
  created_by VARCHAR NOT NULL
);

-- Create Records table
CREATE TABLE IF NOT EXISTS records (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  record_name VARCHAR NOT NULL,
  analysis_result VARCHAR NOT NULL,
  kanban_records VARCHAR NOT NULL,
  created_by VARCHAR NOT NULL
); 