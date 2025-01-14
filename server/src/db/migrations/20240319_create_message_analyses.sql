-- Create message_analyses table
CREATE TABLE IF NOT EXISTS message_analyses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    analysis_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_message_analyses_message_id ON message_analyses(message_id);
CREATE INDEX IF NOT EXISTS idx_message_analyses_created_at ON message_analyses(created_at);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_message_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_message_analyses_updated_at
    BEFORE UPDATE ON message_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_message_analyses_updated_at(); 