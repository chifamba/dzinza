-- Migration to add separate name fields to family_members table
-- This migration adds first_name, middle_name, last_name columns and migrates existing data

-- Add new name columns
ALTER TABLE family_members 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Create a function to split existing names into first/middle/last
CREATE OR REPLACE FUNCTION split_name_to_components()
RETURNS VOID AS $$
DECLARE
    member_record RECORD;
    name_parts TEXT[];
    parts_count INTEGER;
BEGIN
    -- Iterate through all family members with existing names
    FOR member_record IN 
        SELECT id, name FROM family_members 
        WHERE name IS NOT NULL AND name != '' 
        AND (first_name IS NULL OR first_name = '')
    LOOP
        -- Split the name by spaces
        name_parts := string_to_array(trim(member_record.name), ' ');
        parts_count := array_length(name_parts, 1);
        
        -- Handle different name patterns
        IF parts_count = 1 THEN
            -- Single name - treat as first name
            UPDATE family_members 
            SET first_name = name_parts[1]
            WHERE id = member_record.id;
            
        ELSIF parts_count = 2 THEN
            -- Two names - first and last
            UPDATE family_members 
            SET first_name = name_parts[1],
                last_name = name_parts[2]
            WHERE id = member_record.id;
            
        ELSIF parts_count = 3 THEN
            -- Three names - first, middle, last
            UPDATE family_members 
            SET first_name = name_parts[1],
                middle_name = name_parts[2],
                last_name = name_parts[3]
            WHERE id = member_record.id;
            
        ELSIF parts_count >= 4 THEN
            -- Four or more names - first, middle (combined), last
            UPDATE family_members 
            SET first_name = name_parts[1],
                middle_name = array_to_string(name_parts[2:parts_count-1], ' '),
                last_name = name_parts[parts_count]
            WHERE id = member_record.id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the migration function
SELECT split_name_to_components();

-- Drop the migration function (cleanup)
DROP FUNCTION IF EXISTS split_name_to_components();

-- Add indexes for the new name fields
CREATE INDEX IF NOT EXISTS idx_family_members_first_name ON family_members(first_name);
CREATE INDEX IF NOT EXISTS idx_family_members_last_name ON family_members(last_name);

-- Add a computed column function to generate full name
CREATE OR REPLACE FUNCTION get_full_name(first_name TEXT, middle_name TEXT, last_name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN trim(concat_ws(' ', 
        NULLIF(first_name, ''), 
        NULLIF(middle_name, ''), 
        NULLIF(last_name, '')
    ));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update the name column with computed full names for existing records
UPDATE family_members 
SET name = get_full_name(first_name, middle_name, last_name)
WHERE first_name IS NOT NULL OR middle_name IS NOT NULL OR last_name IS NOT NULL;

-- Add a trigger to automatically update the name field when name components change
CREATE OR REPLACE FUNCTION update_full_name()
RETURNS TRIGGER AS $$
BEGIN
    NEW.name = get_full_name(NEW.first_name, NEW.middle_name, NEW.last_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_full_name
    BEFORE INSERT OR UPDATE OF first_name, middle_name, last_name
    ON family_members
    FOR EACH ROW
    EXECUTE FUNCTION update_full_name();
