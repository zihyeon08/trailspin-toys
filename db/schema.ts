/**
 * Drizzle ORM table definitions for the games catalog. This is the single
 * source of truth for the database schema; changes here are paired with a
 * generated drizzle-kit migration in `db/migrations/`.
 */

import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

/** Game publishers. `name` is unique; `description` is seed-generated. */
export const publishers = sqliteTable('publishers', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().unique(),
    description: text('description'),
});

/** Game categories. `name` is unique; `description` is seed-generated. */
export const categories = sqliteTable('categories', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().unique(),
    description: text('description'),
});

/**
 * Games listed on the platform. `starRating` is nullable (not every game is
 * rated); `categoryId`/`publisherId` are required foreign keys.
 */
export const games = sqliteTable('games', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    starRating: real('star_rating'),
    categoryId: integer('category_id')
        .notNull()
        .references(() => categories.id),
    publisherId: integer('publisher_id')
        .notNull()
        .references(() => publishers.id),
});

/** Row shape returned by selects against {@link publishers}. */
export type PublisherRow = typeof publishers.$inferSelect;
/** Row shape returned by selects against {@link categories}. */
export type CategoryRow = typeof categories.$inferSelect;
/** Row shape returned by selects against {@link games}. */
export type GameRow = typeof games.$inferSelect;
