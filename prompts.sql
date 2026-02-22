-- Investor Prompt Templates
INSERT INTO prompt_templates (id, text, role, category, display_order, is_active, created_at, updated_at)
VALUES 
  ('inv_mission', 'What gets you excited about a startup?', 'investor', 'mission', 1, true, NOW(), NOW()),
  ('inv_thesis', 'What is your investment thesis?', 'investor', 'thesis', 2, true, NOW(), NOW()),
  ('inv_preferences', 'What is one trait you look for in founders?', 'investor', 'preferences', 3, true, NOW(), NOW()),
  ('inv_advice', 'What is the best piece of advice you have given a startup?', 'investor', 'advice', 4, true, NOW(), NOW()),
  ('inv_sectors', 'What industry are you most bullish on right now?', 'investor', 'sectors', 5, true, NOW(), NOW()),
  ('inv_style', 'How would you describe your investment style?', 'investor', 'style', 6, true, NOW(), NOW()),
  ('inv_value', 'What value do you bring beyond capital?', 'investor', 'value', 7, true, NOW(), NOW()),
  ('inv_portfolio', 'What is a portfolio company you are proud of?', 'investor', 'portfolio', 8, true, NOW(), NOW());

-- Founder Prompt Templates
INSERT INTO prompt_templates (id, text, role, category, display_order, is_active, created_at, updated_at)
VALUES 
  ('found_mission', 'What problem are you solving?', 'founder', 'mission', 1, true, NOW(), NOW()),
  ('found_traction', 'What is your biggest win so far?', 'founder', 'traction', 2, true, NOW(), NOW()),
  ('found_team', 'What makes your team special?', 'founder', 'team', 3, true, NOW(), NOW()),
  ('found_vision', 'What is your long-term vision?', 'founder', 'vision', 4, true, NOW(), NOW()),
  ('found_preferences', 'What kind of investor are you looking for?', 'founder', 'preferences', 5, true, NOW(), NOW()),
  ('found_why', 'Why are you the right person to build this?', 'founder', 'why', 6, true, NOW(), NOW()),
  ('found_moat', 'What is your competitive advantage?', 'founder', 'moat', 7, true, NOW(), NOW()),
  ('found_challenges', 'What is your biggest challenge right now?', 'founder', 'challenges', 8, true, NOW(), NOW());
