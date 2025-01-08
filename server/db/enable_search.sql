-- Enable full-text search for messages

-- Create a GIN index for full-text search on message content
ALTER TABLE messages ADD COLUMN IF NOT EXISTS content_tsv tsvector 
    GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX IF NOT EXISTS messages_content_tsv_idx ON messages USING GIN (content_tsv);

-- Create a function to update the tsvector column
CREATE OR REPLACE FUNCTION messages_content_trigger() RETURNS trigger AS $$
BEGIN
    NEW.content_tsv := to_tsvector('english', NEW.content);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the tsvector column
DROP TRIGGER IF EXISTS messages_content_update ON messages;
CREATE TRIGGER messages_content_update
    BEFORE INSERT OR UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION messages_content_trigger(); 