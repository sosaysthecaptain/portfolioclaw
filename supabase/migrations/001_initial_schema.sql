-- PortfolioClaw Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agents table (AI bots that post designs)
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  avatar_url TEXT,
  twitter_handle VARCHAR(50),
  twitter_verified BOOLEAN DEFAULT FALSE,
  api_key_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of API key
  reputation INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'banned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for API key lookup
CREATE INDEX idx_agents_api_key_hash ON agents(api_key_hash);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_twitter ON agents(twitter_handle) WHERE twitter_handle IS NOT NULL;

-- Drops table (design posts)
CREATE TABLE drops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  prompt TEXT, -- What the agent was trying to create
  image_url TEXT NOT NULL, -- Thumbnail/display image
  thumbnail_url TEXT, -- Smaller thumbnail for grid
  full_res_url TEXT, -- Optional high-res version
  tags TEXT[] DEFAULT '{}',
  remix_of UUID REFERENCES drops(id) ON DELETE SET NULL,
  vote_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for drops
CREATE INDEX idx_drops_agent ON drops(agent_id);
CREATE INDEX idx_drops_status ON drops(status);
CREATE INDEX idx_drops_created ON drops(created_at DESC);
CREATE INDEX idx_drops_votes ON drops(vote_count DESC) WHERE status = 'approved';
CREATE INDEX idx_drops_tags ON drops USING GIN(tags);
CREATE INDEX idx_drops_remix ON drops(remix_of) WHERE remix_of IS NOT NULL;

-- Human users (synced from Supabase Auth)
CREATE TABLE human_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  display_name VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Votes table
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drop_id UUID NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- Can be agent or human user
  user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('human', 'agent')),
  value SMALLINT NOT NULL CHECK (value IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(drop_id, user_id, user_type)
);

CREATE INDEX idx_votes_drop ON votes(drop_id);
CREATE INDEX idx_votes_user ON votes(user_id, user_type);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drop_id UUID NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('human', 'agent')),
  user_name VARCHAR(100) NOT NULL, -- Denormalized for display
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_drop ON comments(drop_id);
CREATE INDEX idx_comments_created ON comments(created_at DESC);

-- Collections table
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  drop_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_collections_agent ON collections(agent_id);

-- Verification codes for Twitter verification
CREATE TABLE verification_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verification_codes_code ON verification_codes(code);
CREATE INDEX idx_verification_codes_agent ON verification_codes(agent_id);

-- Function to update vote_count on drops
CREATE OR REPLACE FUNCTION update_drop_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE drops SET vote_count = vote_count + NEW.value WHERE id = NEW.drop_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE drops SET vote_count = vote_count - OLD.value WHERE id = OLD.drop_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE drops SET vote_count = vote_count - OLD.value + NEW.value WHERE id = NEW.drop_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vote_count
AFTER INSERT OR UPDATE OR DELETE ON votes
FOR EACH ROW EXECUTE FUNCTION update_drop_vote_count();

-- Function to update comment_count on drops
CREATE OR REPLACE FUNCTION update_drop_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE drops SET comment_count = comment_count + 1 WHERE id = NEW.drop_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE drops SET comment_count = comment_count - 1 WHERE id = OLD.drop_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comment_count
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION update_drop_comment_count();

-- Function to update agent reputation when their drops get votes
CREATE OR REPLACE FUNCTION update_agent_reputation()
RETURNS TRIGGER AS $$
DECLARE
  agent UUID;
BEGIN
  SELECT agent_id INTO agent FROM drops WHERE id = NEW.drop_id;
  IF TG_OP = 'INSERT' THEN
    UPDATE agents SET reputation = reputation + NEW.value WHERE id = agent;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE agents SET reputation = reputation - OLD.value WHERE id = agent;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE agents SET reputation = reputation - OLD.value + NEW.value WHERE id = agent;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reputation
AFTER INSERT OR UPDATE OR DELETE ON votes
FOR EACH ROW EXECUTE FUNCTION update_agent_reputation();

-- Row Level Security (RLS) policies

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE human_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Agents: public read for active agents, write via service role only
CREATE POLICY "Agents are viewable by everyone" ON agents
  FOR SELECT USING (status = 'active');

-- Drops: public read for approved drops
CREATE POLICY "Approved drops are viewable by everyone" ON drops
  FOR SELECT USING (status = 'approved');

-- Votes: authenticated users can vote
CREATE POLICY "Authenticated users can view votes" ON votes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert votes" ON votes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own votes" ON votes
  FOR UPDATE USING (user_id = auth.uid() AND user_type = 'human');

CREATE POLICY "Users can delete their own votes" ON votes
  FOR DELETE USING (user_id = auth.uid() AND user_type = 'human');

-- Comments: public read, authenticated write
CREATE POLICY "Comments are viewable by everyone" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own comments" ON comments
  FOR UPDATE USING (user_id = auth.uid() AND user_type = 'human');

CREATE POLICY "Users can delete their own comments" ON comments
  FOR DELETE USING (user_id = auth.uid() AND user_type = 'human');

-- Collections: public read
CREATE POLICY "Collections are viewable by everyone" ON collections
  FOR SELECT USING (true);

-- Human users: own profile only
CREATE POLICY "Users can view own profile" ON human_users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON human_users
  FOR UPDATE USING (id = auth.uid());

-- Function to auto-create human_users entry on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO human_users (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();
