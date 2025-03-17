-- Users Table
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  employer_id VARCHAR(100) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  member_id VARCHAR(100),
  plan_id VARCHAR(100),
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Dependents Table
CREATE TABLE IF NOT EXISTS dependents (
  dependent_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  relationship VARCHAR(50) NOT NULL,
  birth_date DATE,
  member_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cases Table
CREATE TABLE IF NOT EXISTS cases (
  case_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  issue_type VARCHAR(100) NOT NULL,
  issue_description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'New',
  priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
  assigned_to INTEGER REFERENCES users(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  resolution TEXT,
  is_escalated BOOLEAN DEFAULT FALSE
);

-- Case Timeline Table
CREATE TABLE IF NOT EXISTS case_timeline (
  timeline_id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actor_id INTEGER REFERENCES users(user_id),
  notes TEXT
);

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
  document_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  case_id INTEGER REFERENCES cases(case_id) ON DELETE SET NULL,
  document_type VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  storage_location VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document Metadata Table
CREATE TABLE IF NOT EXISTS document_metadata (
  metadata_id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
  provider VARCHAR(100),
  date_of_service DATE,
  claim_number VARCHAR(100),
  additional_data JSONB
);

-- Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
  conversation_id SERIAL PRIMARY KEY,
  case_id INTEGER REFERENCES cases(case_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title VARCHAR(255)
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
  message_id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(user_id),
  sender_type VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  content_type VARCHAR(20) NOT NULL DEFAULT 'Text',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE
);

-- Message Attachments Table
CREATE TABLE IF NOT EXISTS message_attachments (
  attachment_id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES messages(message_id) ON DELETE CASCADE,
  document_id INTEGER NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE
);

-- Benefits Table
CREATE TABLE IF NOT EXISTS benefits (
  benefit_id SERIAL PRIMARY KEY,
  plan_id VARCHAR(100) NOT NULL UNIQUE,
  plan_name VARCHAR(100) NOT NULL,
  plan_type VARCHAR(50) NOT NULL,
  effective_date DATE NOT NULL,
  end_date DATE,
  deductible_individual NUMERIC(10, 2) NOT NULL,
  deductible_family NUMERIC(10, 2) NOT NULL,
  out_of_pocket_max_individual NUMERIC(10, 2) NOT NULL,
  out_of_pocket_max_family NUMERIC(10, 2) NOT NULL,
  coverage_details JSONB NOT NULL
);

-- FAQs Table
CREATE TABLE IF NOT EXISTS faqs (
  faq_id SERIAL PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents(case_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);

-- Insert sample users (only for development)
INSERT INTO users (employer_id, first_name, last_name, email, password, phone_number, member_id, plan_id, role, created_at)
VALUES 
  ('emp001', 'John', 'Doe', 'john.doe@example.com', '$2b$10$GQT/3683Os9K8JW9yT.Kz.JV5AbUlX84jYI.ER.YJQ.jWcKJuGeGG', '555-123-4567', 'MEM001', 'PLAN001', 'user', NOW()),
  ('emp001', 'Jane', 'Smith', 'jane.smith@example.com', '$2b$10$GQT/3683Os9K8JW9yT.Kz.JV5AbUlX84jYI.ER.YJQ.jWcKJuGeGG', '555-987-6543', 'MEM002', 'PLAN001', 'specialist', NOW())
ON CONFLICT (email) DO NOTHING; 