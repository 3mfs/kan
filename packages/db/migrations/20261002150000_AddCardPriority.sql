CREATE TYPE "public"."card_priority" AS ENUM('very_high', 'high', 'normal', 'low');--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "priority" "public"."card_priority";
