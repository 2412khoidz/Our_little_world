-- V0.1 Migration 3: Private Realtime Broadcast & Presence RLS Policies
-- Note: Do NOT execute ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY (already enabled by Supabase; causes 42501 owner errors).

DROP POLICY IF EXISTS realtime_world_select ON realtime.messages;
CREATE POLICY realtime_world_select
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.world_members wm
      WHERE wm.user_id = auth.uid()
        AND (
          realtime.topic() = ('world:' || wm.world_id::text)
          OR realtime.topic() = ('cinema-spike:' || wm.world_id::text)
        )
    )
  );

DROP POLICY IF EXISTS realtime_world_insert ON realtime.messages;
CREATE POLICY realtime_world_insert
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.world_members wm
      WHERE wm.user_id = auth.uid()
        AND (
          realtime.topic() = ('world:' || wm.world_id::text)
          OR realtime.topic() = ('cinema-spike:' || wm.world_id::text)
        )
    )
  );
