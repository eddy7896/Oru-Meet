-- Enable Realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE polls;
ALTER PUBLICATION supabase_realtime ADD TABLE poll_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE breakout_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE breakout_assignments;
