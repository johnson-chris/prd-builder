-- PRD Builder Database Initialization Script
-- This creates the initial database schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    preferences JSONB DEFAULT '{
        "defaultTemplate": "standard",
        "autoSaveInterval": 60
    }'::jsonb
);

-- PRDs table
CREATE TABLE IF NOT EXISTS prds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'in-review', 'approved')),
    version VARCHAR(20) DEFAULT '1.0.0',
    markdown_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{
        "completenessScore": 0
    }'::jsonb
);

-- Sections table
CREATE TABLE IF NOT EXISTS sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prd_id UUID NOT NULL REFERENCES prds(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    "order" INTEGER NOT NULL,
    required BOOLEAN DEFAULT false,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_prds_user_id ON prds(user_id);
CREATE INDEX IF NOT EXISTS idx_prds_status ON prds(status);
CREATE INDEX IF NOT EXISTS idx_prds_created_at ON prds(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sections_prd_id ON sections(prd_id);
CREATE INDEX IF NOT EXISTS idx_sections_order ON sections("order");

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO prdbuilder;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO prdbuilder;
