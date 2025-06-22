-- Add genealogy tables to the database
-- Family Trees table
CREATE TABLE IF NOT EXISTS family_trees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Family Members table
CREATE TABLE IF NOT EXISTS family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(50) DEFAULT 'unknown',
    birth_date DATE,
    death_date DATE,
    profile_image_url TEXT,
    parent_ids JSONB DEFAULT '[]'::jsonb,
    child_ids JSONB DEFAULT '[]'::jsonb,
    spouse_ids JSONB DEFAULT '[]'::jsonb,
    tree_id UUID NOT NULL REFERENCES family_trees(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Family Relationships table
CREATE TABLE IF NOT EXISTS family_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN ('SPOUSE', 'PARENT_CHILD', 'SIBLING')),
    person1_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    person2_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    tree_id UUID NOT NULL REFERENCES family_trees(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(person1_id, person2_id, relationship_type)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_family_trees_user_id ON family_trees(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_tree_id ON family_members(tree_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_relationships_tree_id ON family_relationships(tree_id);
CREATE INDEX IF NOT EXISTS idx_family_relationships_person1_id ON family_relationships(person1_id);
CREATE INDEX IF NOT EXISTS idx_family_relationships_person2_id ON family_relationships(person2_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_family_trees_updated_at BEFORE UPDATE ON family_trees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_family_members_updated_at BEFORE UPDATE ON family_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
