ALTER TABLE "children" ADD COLUMN "client_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "children_parent_client_idx" ON "children" USING btree ("clerk_user_id","client_id");