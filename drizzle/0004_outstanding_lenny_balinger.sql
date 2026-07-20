CREATE TYPE "public"."question_status" AS ENUM('draft', 'published', 'rejected');--> statement-breakpoint
CREATE TABLE "curriculum_objectives" (
	"id" text PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"year_code" text NOT NULL,
	"topic" text NOT NULL,
	"code" text,
	"statement" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_impressions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	"set_id" text NOT NULL,
	"served_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD COLUMN "status" "question_status" DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD COLUMN "objective_id" text;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD COLUMN "difficulty" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD COLUMN "source" text DEFAULT 'seed' NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "question_impressions" ADD CONSTRAINT "question_impressions_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_impressions" ADD CONSTRAINT "question_impressions_question_id_quiz_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "objectives_year_subject_idx" ON "curriculum_objectives" USING btree ("year_code","subject");--> statement-breakpoint
CREATE INDEX "objectives_topic_idx" ON "curriculum_objectives" USING btree ("topic");--> statement-breakpoint
CREATE UNIQUE INDEX "impressions_child_question_idx" ON "question_impressions" USING btree ("child_id","question_id");--> statement-breakpoint
CREATE INDEX "impressions_child_set_served_idx" ON "question_impressions" USING btree ("child_id","set_id","served_at");--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_objective_id_curriculum_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."curriculum_objectives"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quiz_set_status_idx" ON "quiz_questions" USING btree ("set_id","status");--> statement-breakpoint
CREATE INDEX "quiz_objective_idx" ON "quiz_questions" USING btree ("objective_id");