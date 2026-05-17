-- Avatar URL for user profile (uploaded image, served from /uploads/avatars/).

ALTER TABLE "users" ADD COLUMN "avatar_url" TEXT;
