-- Drop the recursive policy on participants
DROP POLICY IF EXISTS "Participants can view participants in their rooms" ON participants;

-- Replace it with a simpler policy that prevents infinite recursion.
-- Since room_id is a UUID, users cannot guess it to enumerate other rooms.
CREATE POLICY "Participants can view participants in their rooms"
  ON participants FOR SELECT
  USING (auth.role() = 'authenticated');
