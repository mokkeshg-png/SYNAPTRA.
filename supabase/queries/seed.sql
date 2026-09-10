-- =============================================================================
-- SYNAPTRA — Seed Data
-- Safe to execute after schema.sql has been applied.
-- Does NOT insert fake users. Does NOT modify schema.
-- Run once in Supabase SQL Editor.
-- =============================================================================

-- ------------------------------------------------------------
-- Skill Categories
-- ------------------------------------------------------------
INSERT INTO skill_categories (name, description) VALUES
    ('Programming',     'Programming languages and paradigms'),
    ('Machine Learning','ML, DL, and AI techniques'),
    ('Data',            'Data processing, analysis, and science'),
    ('Systems',         'Systems engineering, DevOps, and infrastructure'),
    ('Research',        'Academic research skills'),
    ('Design',          'UI/UX and product design'),
    ('Domain',          'Domain-specific technical skills')
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------
-- Skills (linked to categories via subquery)
-- ------------------------------------------------------------
INSERT INTO skills (name, category_id) VALUES
    -- Programming
    ('Python',      (SELECT id FROM skill_categories WHERE name = 'Programming')),
    ('Java',        (SELECT id FROM skill_categories WHERE name = 'Programming')),
    ('C++',         (SELECT id FROM skill_categories WHERE name = 'Programming')),
    ('JavaScript',  (SELECT id FROM skill_categories WHERE name = 'Programming')),
    ('TypeScript',  (SELECT id FROM skill_categories WHERE name = 'Programming')),
    ('Go',          (SELECT id FROM skill_categories WHERE name = 'Programming')),
    ('R',           (SELECT id FROM skill_categories WHERE name = 'Programming')),
    ('MATLAB',      (SELECT id FROM skill_categories WHERE name = 'Programming')),
    -- Machine Learning
    ('Machine Learning',            (SELECT id FROM skill_categories WHERE name = 'Machine Learning')),
    ('Deep Learning',               (SELECT id FROM skill_categories WHERE name = 'Machine Learning')),
    ('Computer Vision',             (SELECT id FROM skill_categories WHERE name = 'Machine Learning')),
    ('Natural Language Processing', (SELECT id FROM skill_categories WHERE name = 'Machine Learning')),
    ('Reinforcement Learning',      (SELECT id FROM skill_categories WHERE name = 'Machine Learning')),
    ('MLOps',                       (SELECT id FROM skill_categories WHERE name = 'Machine Learning')),
    -- Data
    ('Data Analysis',    (SELECT id FROM skill_categories WHERE name = 'Data')),
    ('Data Science',     (SELECT id FROM skill_categories WHERE name = 'Data')),
    ('Statistics',       (SELECT id FROM skill_categories WHERE name = 'Data')),
    ('SQL',              (SELECT id FROM skill_categories WHERE name = 'Data')),
    ('Pandas',           (SELECT id FROM skill_categories WHERE name = 'Data')),
    ('Dataset Curation', (SELECT id FROM skill_categories WHERE name = 'Data')),
    -- Systems
    ('Backend',  (SELECT id FROM skill_categories WHERE name = 'Systems')),
    ('Frontend', (SELECT id FROM skill_categories WHERE name = 'Systems')),
    ('Cloud',    (SELECT id FROM skill_categories WHERE name = 'Systems')),
    ('DevOps',   (SELECT id FROM skill_categories WHERE name = 'Systems')),
    ('Git',      (SELECT id FROM skill_categories WHERE name = 'Systems')),
    ('Docker',   (SELECT id FROM skill_categories WHERE name = 'Systems')),
    -- Research
    ('Research Writing',    (SELECT id FROM skill_categories WHERE name = 'Research')),
    ('Literature Review',   (SELECT id FROM skill_categories WHERE name = 'Research')),
    ('Experiment Design',   (SELECT id FROM skill_categories WHERE name = 'Research')),
    ('Academic Publishing', (SELECT id FROM skill_categories WHERE name = 'Research')),
    ('Survey Design',       (SELECT id FROM skill_categories WHERE name = 'Research')),
    -- Design
    ('UI/UX',          (SELECT id FROM skill_categories WHERE name = 'Design')),
    ('Figma',          (SELECT id FROM skill_categories WHERE name = 'Design')),
    ('Product Design', (SELECT id FROM skill_categories WHERE name = 'Design')),
    -- Domain
    ('Healthcare AI',    (SELECT id FROM skill_categories WHERE name = 'Domain')),
    ('Agriculture Tech', (SELECT id FROM skill_categories WHERE name = 'Domain')),
    ('Cybersecurity',    (SELECT id FROM skill_categories WHERE name = 'Domain')),
    ('IoT',              (SELECT id FROM skill_categories WHERE name = 'Domain')),
    ('Robotics',         (SELECT id FROM skill_categories WHERE name = 'Domain')),
    ('HCI',              (SELECT id FROM skill_categories WHERE name = 'Domain'))
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------
-- Interest Categories
-- ------------------------------------------------------------
INSERT INTO interest_categories (name, description) VALUES
    ('Computing',    'Core computer science and AI research areas'),
    ('Science',      'Applied science and interdisciplinary research'),
    ('Society',      'Technology impact on education and society'),
    ('Engineering',  'Systems, hardware, and security research')
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------
-- Research Interests (linked to categories via subquery)
-- ------------------------------------------------------------
INSERT INTO research_interests (name, category_id) VALUES
    -- Computing
    ('Artificial Intelligence',     (SELECT id FROM interest_categories WHERE name = 'Computing')),
    ('Machine Learning',            (SELECT id FROM interest_categories WHERE name = 'Computing')),
    ('Computer Vision',             (SELECT id FROM interest_categories WHERE name = 'Computing')),
    ('Natural Language Processing', (SELECT id FROM interest_categories WHERE name = 'Computing')),
    ('Human-Computer Interaction',  (SELECT id FROM interest_categories WHERE name = 'Computing')),
    ('Distributed Systems',         (SELECT id FROM interest_categories WHERE name = 'Computing')),
    -- Science
    ('Healthcare AI',         (SELECT id FROM interest_categories WHERE name = 'Science')),
    ('Computational Biology', (SELECT id FROM interest_categories WHERE name = 'Science')),
    ('Climate Informatics',   (SELECT id FROM interest_categories WHERE name = 'Science')),
    ('Agriculture Tech',      (SELECT id FROM interest_categories WHERE name = 'Science')),
    -- Society
    ('Education Technology', (SELECT id FROM interest_categories WHERE name = 'Society')),
    ('Digital Humanities',   (SELECT id FROM interest_categories WHERE name = 'Society')),
    ('Responsible AI',       (SELECT id FROM interest_categories WHERE name = 'Society')),
    ('Accessibility',        (SELECT id FROM interest_categories WHERE name = 'Society')),
    -- Engineering
    ('Embedded Systems',     (SELECT id FROM interest_categories WHERE name = 'Engineering')),
    ('Robotics',             (SELECT id FROM interest_categories WHERE name = 'Engineering')),
    ('Cybersecurity',        (SELECT id FROM interest_categories WHERE name = 'Engineering')),
    ('Software Engineering', (SELECT id FROM interest_categories WHERE name = 'Engineering'))
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------
-- Project Types
-- ------------------------------------------------------------
INSERT INTO project_types (name, description) VALUES
    ('Academic Project',      'Course-related academic projects and assignments'),
    ('Research Project',      'Original research investigations'),
    ('Final-Year Project',    'Capstone/thesis projects for graduating students'),
    ('Hackathon',             'Time-bounded competitive innovation events'),
    ('Innovation Project',    'Novel solution development and prototyping'),
    ('Open-Source',           'Open-source software contributions'),
    ('Publication-Oriented',  'Projects aimed at academic publication'),
    ('Faculty-Led Research',  'Research projects led by faculty members'),
    ('Interdisciplinary',     'Projects spanning multiple academic disciplines')
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------
-- Platform Configuration Defaults
-- ------------------------------------------------------------
INSERT INTO platform_configuration (key, value, description) VALUES
    ('recommendation_weights',
     '{"skill": 0.28, "interest": 0.22, "role": 0.16, "experience": 0.14, "recency": 0.12, "availability": 0.08}',
     'Weights for project recommendation scoring'),
    ('compatibility_weights',
     '{"skill": 0.35, "interest": 0.25, "role": 0.20, "experience": 0.20}',
     'Weights for compatibility analysis scoring'),
    ('ai_disclaimer',
     '"This is an AI-estimated compatibility score, not an objective measurement of ability. AI recommends; humans decide."',
     'Standard AI disclaimer text'),
    ('max_applications_per_user',
     '10',
     'Maximum pending applications a user can have'),
    ('profile_completeness_threshold',
     '70',
     'Minimum profile completeness for AI matching')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- END OF SEED DATA
-- =============================================================================
