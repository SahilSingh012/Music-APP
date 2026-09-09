CREATE TABLE "artists" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"language" varchar(24) NOT NULL,
	"bio" text,
	"listeners_monthly" integer DEFAULT 0 NOT NULL,
	"artwork_seed" varchar(40) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" varchar(64) NOT NULL,
	"song_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listeners" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" varchar(64) NOT NULL,
	"handle" varchar(40),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "play_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" varchar(64) NOT NULL,
	"song_id" integer NOT NULL,
	"seconds" integer DEFAULT 0 NOT NULL,
	"played_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playlist_songs" (
	"id" serial PRIMARY KEY NOT NULL,
	"playlist_id" integer NOT NULL,
	"song_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playlists" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" varchar(64) NOT NULL,
	"name" varchar(120) NOT NULL,
	"artwork_seed" varchar(40) DEFAULT '0' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "songs" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"artist_id" integer NOT NULL,
	"language" varchar(24) NOT NULL,
	"genre" varchar(60) DEFAULT 'pop' NOT NULL,
	"album" varchar(200),
	"release_year" integer DEFAULT 2024 NOT NULL,
	"duration_sec" integer DEFAULT 210 NOT NULL,
	"audio_url" text NOT NULL,
	"video_id" varchar(32),
	"alt_video_ids" text,
	"video_title" varchar(240),
	"video_channel" varchar(160),
	"resolved_at" timestamp with time zone,
	"artwork_seed" varchar(40) DEFAULT '0' NOT NULL,
	"moods" text DEFAULT '' NOT NULL,
	"play_count" integer DEFAULT 0 NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"is_new" boolean DEFAULT false NOT NULL,
	"is_trending" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_events" ADD CONSTRAINT "play_events_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_songs" ADD CONSTRAINT "playlist_songs_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_songs" ADD CONSTRAINT "playlist_songs_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "songs" ADD CONSTRAINT "songs_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "artists_slug_key" ON "artists" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "likes_device_song_key" ON "likes" USING btree ("device_id","song_id");--> statement-breakpoint
CREATE UNIQUE INDEX "listeners_device_id_key" ON "listeners" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "play_events_device_idx" ON "play_events" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "play_events_song_idx" ON "play_events" USING btree ("song_id");--> statement-breakpoint
CREATE UNIQUE INDEX "playlist_songs_unique_key" ON "playlist_songs" USING btree ("playlist_id","song_id");--> statement-breakpoint
CREATE INDEX "playlists_device_idx" ON "playlists" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "songs_language_idx" ON "songs" USING btree ("language");--> statement-breakpoint
CREATE INDEX "songs_artist_idx" ON "songs" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "songs_release_year_idx" ON "songs" USING btree ("release_year");--> statement-breakpoint
CREATE UNIQUE INDEX "songs_title_artist_key" ON "songs" USING btree ("title","artist_id");