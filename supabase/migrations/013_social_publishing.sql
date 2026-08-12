-- Social caption and image fields for social_post deliverables
alter table deliverables add column if not exists social_caption text;
alter table deliverables add column if not exists social_image_url text;
