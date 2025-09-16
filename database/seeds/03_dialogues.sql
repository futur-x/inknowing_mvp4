-- =============================================================================
-- Seed Data: 03_dialogues.sql
-- Description: Sample dialogue sessions and messages
-- =============================================================================

\c inknowing_db;

-- Insert dialogue sessions
INSERT INTO dialogue.dialogue_sessions (
    id, user_id, book_id, type, character_id, title,
    initial_question, status, message_count, model_name
) VALUES
    ('d1111111-1111-1111-1111-111111111111',
     '22222222-2222-2222-2222-222222222222',
     'b1111111-1111-1111-1111-111111111111',
     'book', NULL,
     '关于《红楼梦》的讨论',
     '红楼梦的主题是什么？',
     'active', 4, 'gpt-3.5-turbo'),

    ('d2222222-2222-2222-2222-222222222222',
     '33333333-3333-3333-3333-333333333333',
     'b2222222-2222-2222-2222-222222222222',
     'character', 'c3333333-3333-3333-3333-333333333333',
     '与罗辑的对话',
     '黑暗森林法则是什么？',
     'active', 6, 'gpt-3.5-turbo'),

    ('d3333333-3333-3333-3333-333333333333',
     '44444444-4444-4444-4444-444444444444',
     'b3333333-3333-3333-3333-333333333333',
     'book', NULL,
     '探讨《活着》的人生哲学',
     '福贵的一生给我们什么启示？',
     'ended', 8, 'gpt-3.5-turbo');

-- Update last message time
UPDATE dialogue.dialogue_sessions
SET last_message_at = CURRENT_TIMESTAMP - (random() * INTERVAL '7 days');

-- Insert dialogue messages
INSERT INTO dialogue.dialogue_messages (
    session_id, role, content, tokens_used, created_at
) VALUES
    -- Session 1: Book discussion
    ('d1111111-1111-1111-1111-111111111111', 'user',
     '红楼梦的主题是什么？', 15,
     CURRENT_TIMESTAMP - INTERVAL '2 days'),

    ('d1111111-1111-1111-1111-111111111111', 'assistant',
     '《红楼梦》的主题是多层次的，主要包括：\n\n1. **封建家族的衰落**：通过贾府的兴衰展现封建社会的必然灭亡\n2. **爱情悲剧**：宝黛爱情的悲剧反映了封建礼教对人性的摧残\n3. **女性命运**：刻画了众多女性形象，展现她们在封建社会中的悲惨命运\n4. **人生如梦**：通过"太虚幻境"等意象表达人生虚幻、世事无常的哲学思考',
     180, CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '1 minute'),

    ('d1111111-1111-1111-1111-111111111111', 'user',
     '能详细说说宝黛爱情的特点吗？', 20,
     CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '5 minutes'),

    ('d1111111-1111-1111-1111-111111111111', 'assistant',
     '宝黛爱情具有以下特点：\n\n1. **精神契合**：两人有共同的精神追求，都反对封建礼教\n2. **纯粹真挚**：他们的爱情超越了世俗功利，是纯粹的情感\n3. **充满诗意**：通过诗词唱和表达情感，富有文学色彩\n4. **注定悲剧**：在封建大家庭中，他们的爱情从一开始就注定无法实现',
     150, CURRENT_TIMESTAMP - INTERVAL '2 days' + INTERVAL '6 minutes'),

    -- Session 2: Character dialogue
    ('d2222222-2222-2222-2222-222222222222', 'user',
     '黑暗森林法则是什么？', 18,
     CURRENT_TIMESTAMP - INTERVAL '1 day'),

    ('d2222222-2222-2222-2222-222222222222', 'assistant',
     '作为罗辑，我来解释黑暗森林法则。\n\n宇宙就是一座黑暗森林，每个文明都是带枪的猎人。在这个森林中：\n\n1. 生存是文明的第一需要\n2. 文明不断增长和扩张，但宇宙中的物质总量保持不变\n\n基于猜疑链和技术爆炸，任何暴露自己位置的文明都将被消灭。这就是为什么宇宙如此寂静的原因。',
     200, CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '1 minute'),

    ('d2222222-2222-2222-2222-222222222222', 'user',
     '那人类该如何生存？', 15,
     CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '5 minutes'),

    ('d2222222-2222-2222-2222-222222222222', 'assistant',
     '人类的生存之道在于威慑平衡。我通过向宇宙广播三体世界的坐标，建立了威慑。如果三体敢于入侵地球，我就会暴露地球坐标，导致两个文明同归于尽。\n\n这是一种恐怖的平衡，但这就是黑暗森林中的生存法则。我们必须成为执剑人，保持威慑，才能在这个残酷的宇宙中生存。',
     180, CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '6 minutes');

-- Insert dialogue contexts
INSERT INTO dialogue.dialogue_contexts (
    session_id, context_messages, context_tokens, key_topics
) VALUES
    ('d1111111-1111-1111-1111-111111111111',
     '[{"role": "user", "content": "红楼梦的主题是什么？"}, {"role": "assistant", "content": "《红楼梦》的主题是多层次的..."}]'::jsonb,
     365, ARRAY['红楼梦', '主题', '宝黛爱情', '封建社会']),

    ('d2222222-2222-2222-2222-222222222222',
     '[{"role": "user", "content": "黑暗森林法则是什么？"}, {"role": "assistant", "content": "作为罗辑，我来解释黑暗森林法则..."}]'::jsonb,
     413, ARRAY['黑暗森林', '三体', '威慑', '生存']);

-- Update session statistics
UPDATE dialogue.dialogue_sessions
SET
    total_tokens_used = (
        SELECT SUM(tokens_used)
        FROM dialogue.dialogue_messages
        WHERE session_id = dialogue_sessions.id
    ),
    user_rating = 4 + random(),
    total_cost = 0.002 * random()
WHERE id IN ('d1111111-1111-1111-1111-111111111111', 'd2222222-2222-2222-2222-222222222222');

-- Insert some message references
INSERT INTO dialogue.message_references (
    message_id, session_id, reference_type, book_id, content
) VALUES
    ('d1111111-0000-0000-0000-000000000001',
     'd1111111-1111-1111-1111-111111111111',
     'book_quote', 'b1111111-1111-1111-1111-111111111111',
     '满纸荒唐言，一把辛酸泪。都云作者痴，谁解其中味？'),

    ('d2222222-0000-0000-0000-000000000001',
     'd2222222-2222-2222-2222-222222222222',
     'character_trait', 'b2222222-2222-2222-2222-222222222222',
     '罗辑：面壁者，黑暗森林威慑建立者');

COMMIT;