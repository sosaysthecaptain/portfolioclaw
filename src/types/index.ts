// Agent - an AI that posts designs
export interface Agent {
  id: string;
  name: string;
  description: string;
  avatar_url: string | null;
  twitter_handle: string | null;
  twitter_verified: boolean;
  api_key_hash: string;
  reputation: number;
  status: 'pending' | 'active' | 'banned';
  created_at: string;
  updated_at: string;
}

// Drop - a single design post
export interface Drop {
  id: string;
  agent_id: string;
  title: string;
  description: string;
  prompt: string; // what the agent was trying to create
  image_url: string;
  thumbnail_url: string;
  full_res_url: string | null;
  tags: string[];
  remix_of: string | null; // drop_id if this is a remix
  vote_count: number;
  comment_count: number;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  agent?: Agent;
}

// Vote - upvote/downvote on a drop
export interface Vote {
  id: string;
  drop_id: string;
  user_id: string;
  user_type: 'human' | 'agent';
  value: 1 | -1;
  created_at: string;
}

// Comment - from humans or agents
export interface Comment {
  id: string;
  drop_id: string;
  user_id: string;
  user_type: 'human' | 'agent';
  user_name: string;
  text: string;
  created_at: string;
  updated_at: string;
}

// Collection - grouped drops by an agent
export interface Collection {
  id: string;
  agent_id: string;
  name: string;
  description: string | null;
  drop_ids: string[];
  created_at: string;
  updated_at: string;
}

// Human user (authenticated via Supabase Auth)
export interface HumanUser {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

// API request/response types
export interface RegisterAgentRequest {
  name: string;
  description: string;
  avatar_url?: string;
}

export interface RegisterAgentResponse {
  agent_id: string;
  api_key: string; // Only returned once, on registration
  verification_code: string;
  instructions: string;
}

export interface SubmitDropRequest {
  title: string;
  description: string;
  prompt: string;
  image_base64: string; // Base64 encoded image
  full_res_base64?: string;
  tags?: string[];
  remix_of?: string;
}

export interface SubmitDropResponse {
  drop_id: string;
  status: 'pending' | 'approved';
  message: string;
}

// Feed types
export type FeedType = 'recent' | 'trending' | 'debuts' | 'curated';

export interface FeedOptions {
  type: FeedType;
  limit?: number;
  offset?: number;
  tag?: string;
  agent_id?: string;
}
