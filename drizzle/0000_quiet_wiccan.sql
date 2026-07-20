CREATE TYPE "public"."avatar_kind" AS ENUM('preset', 'emoji', 'image');--> statement-breakpoint
CREATE TYPE "public"."cert_tier" AS ENUM('Gold', 'Silver', 'Bronze');--> statement-breakpoint
CREATE TYPE "public"."quiz_kind" AS ENUM('mcq', 'multi', 'fill', 'order', 'match');--> statement-breakpoint
CREATE TYPE "public"."rating" AS ENUM('tricky', 'gotit');--> statement-breakpoint
CREATE TYPE "public"."sub_status" AS ENUM('none', 'trialing', 'active', 'expired');--> statement-breakpoint
CREATE TABLE "cards" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"set_id" text NOT NULL,
	"tier" "cert_tier" DEFAULT 'Gold' NOT NULL,
	"reference" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "children" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"name" text NOT NULL,
	"year_code" text NOT NULL,
	"birth_month" text NOT NULL,
	"birth_year" text NOT NULL,
	"avatar_kind" "avatar_kind" DEFAULT 'preset' NOT NULL,
	"avatar_value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"set_id" text NOT NULL,
	"kind" "quiz_kind" NOT NULL,
	"prompt" text NOT NULL,
	"explanation" text,
	"topic" text,
	"payload" jsonb NOT NULL,
	"mixed" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"set_id" text NOT NULL,
	"card_id" text NOT NULL,
	"box" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"last_rating" "rating" NOT NULL,
	"last_reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"set_id" text NOT NULL,
	"set_title" text NOT NULL,
	"subject" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"cards_reviewed" integer DEFAULT 0 NOT NULL,
	"minutes" integer DEFAULT 0 NOT NULL,
	"score" integer,
	"score_total" integer
);
--> statement-breakpoint
CREATE TABLE "study_sets" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"subject" text NOT NULL,
	"topic" text NOT NULL,
	"year_code" text NOT NULL,
	"description" text NOT NULL,
	"minutes" integer DEFAULT 0 NOT NULL,
	"mastered" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"revisit" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"clerk_user_id" text PRIMARY KEY NOT NULL,
	"status" "sub_status" DEFAULT 'none' NOT NULL,
	"plan" text,
	"current_period_end" timestamp with time zone,
	"revenuecat_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_set_id_study_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."study_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_set_id_study_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."study_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cards_set_idx" ON "cards" USING btree ("set_id");--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_child_set_idx" ON "certificates" USING btree ("child_id","set_id");--> statement-breakpoint
CREATE INDEX "children_parent_idx" ON "children" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "quiz_set_idx" ON "quiz_questions" USING btree ("set_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_child_card_idx" ON "reviews" USING btree ("child_id","set_id","card_id");--> statement-breakpoint
CREATE INDEX "reviews_due_idx" ON "reviews" USING btree ("child_id","due_at");--> statement-breakpoint
CREATE INDEX "sessions_child_at_idx" ON "sessions" USING btree ("child_id","at");--> statement-breakpoint
CREATE INDEX "study_sets_year_idx" ON "study_sets" USING btree ("year_code");--> statement-breakpoint
CREATE INDEX "study_sets_subject_idx" ON "study_sets" USING btree ("subject");