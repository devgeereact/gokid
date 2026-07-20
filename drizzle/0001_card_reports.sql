CREATE TABLE "card_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"set_id" text NOT NULL,
	"reason" text NOT NULL,
	"detail" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "card_reports_status_idx" ON "card_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "card_reports_card_idx" ON "card_reports" USING btree ("card_id");