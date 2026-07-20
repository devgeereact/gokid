ALTER TABLE "sessions" ADD COLUMN "client_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_child_client_idx" ON "sessions" USING btree ("child_id","client_id");