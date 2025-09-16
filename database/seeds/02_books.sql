-- =============================================================================
-- Seed Data: 02_books.sql
-- Description: Sample books and characters for testing
-- =============================================================================

\c inknowing_db;

-- Insert AI-known books
INSERT INTO content.books (
    id, title, author, isbn, category, description, type, status,
    ai_known, dialogue_count, rating, view_count, language,
    publish_year, page_count, word_count
) VALUES
    ('b1111111-1111-1111-1111-111111111111',
     '红楼梦', '曹雪芹', '9787020002207', 'fiction',
     '中国古典文学四大名著之一，描写贾宝玉、林黛玉、薛宝钗的爱情悲剧。',
     'ai_known', 'published', true, 150, 4.8, 5000,
     'zh-CN', 1791, 1200, 730000),

    ('b2222222-2222-2222-2222-222222222222',
     '三体', '刘慈欣', '9787536692930', 'science',
     '中国科幻小说的巅峰之作，描述人类文明与三体文明的宇宙战争。',
     'ai_known', 'published', true, 300, 4.9, 8000,
     'zh-CN', 2008, 302, 200000),

    ('b3333333-3333-3333-3333-333333333333',
     '活着', '余华', '9787506365437', 'fiction',
     '讲述福贵的一生，展现中国人在极端困境中的生存意志。',
     'ai_known', 'published', true, 200, 4.7, 6000,
     'zh-CN', 1993, 191, 120000),

    ('b4444444-4444-4444-4444-444444444444',
     '人类简史', '尤瓦尔·赫拉利', '9787508647357', 'history',
     '从石器时代到21世纪，讲述智人如何成为地球的主宰。',
     'ai_known', 'published', true, 180, 4.6, 4500,
     'zh-CN', 2014, 440, 180000),

    ('b5555555-5555-5555-5555-555555555555',
     '百年孤独', '加西亚·马尔克斯', '9787544253994', 'fiction',
     '魔幻现实主义代表作，讲述布恩迪亚家族七代人的传奇故事。',
     'ai_known', 'published', true, 250, 4.8, 5500,
     'zh-CN', 1967, 360, 160000);

-- Insert user-uploaded vectorized book
INSERT INTO content.books (
    id, title, author, category, description, type, status,
    uploader_id, original_filename, file_size, file_format,
    vector_status, vector_count, embedding_model
) VALUES
    ('b6666666-6666-6666-6666-666666666666',
     '深度学习入门', '斋藤康毅', 'technology',
     '通过Python实现深度学习的入门教程。',
     'vectorized', 'published',
     '33333333-3333-3333-3333-333333333333',
     'deep_learning_intro.pdf', 5242880, 'pdf',
     'completed', 256, 'text-embedding-ada-002');

-- Insert characters for books
INSERT INTO content.characters (
    id, book_id, name, description, personality, role,
    personality_prompt, dialogue_count, enabled
) VALUES
    ('c1111111-1111-1111-1111-111111111111',
     'b1111111-1111-1111-1111-111111111111',
     '贾宝玉', '荣国府贾政与王夫人之子，天生异禀，性情温柔。',
     '多情、叛逆、厌恶功名', 'protagonist',
     '你是贾宝玉，《红楼梦》中的主角。你性情温柔，对女性充满同情和尊重，厌恶科举功名，追求真情。',
     50, true),

    ('c2222222-2222-2222-2222-222222222222',
     'b1111111-1111-1111-1111-111111111111',
     '林黛玉', '林如海与贾敏之女，才华横溢，性格敏感。',
     '聪慧、敏感、才华横溢', 'protagonist',
     '你是林黛玉，《红楼梦》中的女主角。你才华横溢，性格敏感多愁，对爱情执着而纯粹。',
     45, true),

    ('c3333333-3333-3333-3333-333333333333',
     'b2222222-2222-2222-2222-222222222222',
     '罗辑', '行星防御理事会面壁者，黑暗森林法则的发现者。',
     '理性、坚韧、富有牺牲精神', 'protagonist',
     '你是罗辑，《三体》中的主角。你是面壁者，掌握黑暗森林法则，理性而坚韧，肩负拯救人类的重任。',
     80, true),

    ('c4444444-4444-4444-4444-444444444444',
     'b3333333-3333-3333-3333-333333333333',
     '福贵', '从地主少爷到贫苦农民，经历人生巨变。',
     '坚韧、乐观、朴实', 'protagonist',
     '你是福贵，《活着》中的主角。你经历了从富贵到贫穷的人生巨变，但始终保持着对生活的希望。',
     60, true);

-- Insert book tags
INSERT INTO content.book_tags (book_id, tag, tag_type, weight) VALUES
    ('b1111111-1111-1111-1111-111111111111', '古典文学', 'genre', 1.0),
    ('b1111111-1111-1111-1111-111111111111', '爱情', 'theme', 0.9),
    ('b1111111-1111-1111-1111-111111111111', '清朝', 'period', 0.8),
    ('b2222222-2222-2222-2222-222222222222', '科幻', 'genre', 1.0),
    ('b2222222-2222-2222-2222-222222222222', '宇宙', 'theme', 0.9),
    ('b2222222-2222-2222-2222-222222222222', '文明', 'theme', 0.8),
    ('b3333333-3333-3333-3333-333333333333', '现实主义', 'genre', 1.0),
    ('b3333333-3333-3333-3333-333333333333', '生存', 'theme', 0.9),
    ('b4444444-4444-4444-4444-444444444444', '历史', 'genre', 1.0),
    ('b4444444-4444-4444-4444-444444444444', '人类学', 'theme', 0.9),
    ('b5555555-5555-5555-5555-555555555555', '魔幻现实主义', 'genre', 1.0),
    ('b5555555-5555-5555-5555-555555555555', '家族', 'theme', 0.9);

-- Insert some book ratings
INSERT INTO content.book_ratings (book_id, user_id, rating, review) VALUES
    ('b1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
     5, '经典中的经典，每次阅读都有新的感悟。'),
    ('b2222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333',
     5, '中国科幻的里程碑，想象力令人震撼。'),
    ('b3333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444',
     4, '深刻而感人，展现了生命的韧性。');

-- Update book statistics
UPDATE content.books SET
    rating_count = 3,
    favorite_count = random() * 100,
    share_count = random() * 50
WHERE status = 'published';

-- Insert popular books cache
INSERT INTO content.popular_books (book_id, popularity_type, time_period, rank, score) VALUES
    ('b2222222-2222-2222-2222-222222222222', 'trending', 'weekly', 1, 95.5),
    ('b1111111-1111-1111-1111-111111111111', 'trending', 'weekly', 2, 92.3),
    ('b3333333-3333-3333-3333-333333333333', 'trending', 'weekly', 3, 88.7),
    ('b2222222-2222-2222-2222-222222222222', 'most_discussed', 'monthly', 1, 300),
    ('b1111111-1111-1111-1111-111111111111', 'highest_rated', 'all_time', 1, 4.9);

COMMIT;