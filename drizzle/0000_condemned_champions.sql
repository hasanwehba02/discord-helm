CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`thread_id` text NOT NULL,
	`discord_id` text NOT NULL,
	`role` text NOT NULL,
	`author_id` text,
	`author_name` text,
	`content` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `messages_discord_id_unique` ON `messages` (`discord_id`);--> statement-breakpoint
CREATE INDEX `idx_messages_thread` ON `messages` (`thread_id`,`created_at`);