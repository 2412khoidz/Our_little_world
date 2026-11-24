-- Synthetic dev seed only (never commit real user emails/passwords or production tokens).
-- Run manually in local/dev SQL editor after creating dev auth users:
--   11111111-1111-4111-8111-111111111111 (Partner A - An)
--   22222222-2222-4222-8222-222222222222 (Partner B - Bình)
--   33333333-3333-4333-8333-333333333333 (Outsider - Khách lạ)

INSERT INTO public.profiles (user_id, nickname, avatar_config)
VALUES
  (
    '11111111-1111-4111-8111-111111111111',
    'An',
    '{"skinTone":"warm","hairStyle":"short","hairColor":"espresso","outfitStyle":"sweater","outfitColor":"sage","accessory":"glasses"}'::jsonb
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Bình',
    '{"skinTone":"fair","hairStyle":"long","hairColor":"chestnut","outfitStyle":"cardigan","outfitColor":"rose","accessory":"ribbon"}'::jsonb
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'Khách lạ',
    '{"skinTone":"tan","hairStyle":"bob","hairColor":"honey","outfitStyle":"overall","outfitColor":"sky","accessory":"none"}'::jsonb
  )
ON CONFLICT (user_id) DO NOTHING;
