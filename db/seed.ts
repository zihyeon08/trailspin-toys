import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { eq } from 'drizzle-orm';
import { createDatabase, type Database } from '../src/lib/db';
import { categories, games, publishers } from './schema';
import {
    categoryDescription,
    gameDescription,
    parseGamesCsv,
    publisherDescription,
    ratingFromTitle,
    uniqueCategories,
    uniquePublishers,
} from './transforms';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Insert any category names that don't yet exist, returning a lookup of all
 * requested names to their row ids.
 *
 * @param db - Injectable database client.
 * @param names - Distinct category names to ensure exist.
 * @returns Map of category name to its database id.
 */
async function upsertCategories(db: Database, names: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    for (const name of names) {
        const existing = await db.select().from(categories).where(eq(categories.name, name)).limit(1);
        if (existing.length > 0) {
            map.set(name, existing[0].id);
            continue;
        }
        const [row] = await db
            .insert(categories)
            .values({ name, description: categoryDescription(name) })
            .returning({ id: categories.id });
        map.set(name, row.id);
    }
    return map;
}

/**
 * Insert any publisher names that don't yet exist, returning a lookup of all
 * requested names to their row ids.
 *
 * @param db - Injectable database client.
 * @param names - Distinct publisher names to ensure exist.
 * @returns Map of publisher name to its database id.
 */
async function upsertPublishers(db: Database, names: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    for (const name of names) {
        const existing = await db.select().from(publishers).where(eq(publishers.name, name)).limit(1);
        if (existing.length > 0) {
            map.set(name, existing[0].id);
            continue;
        }
        const [row] = await db
            .insert(publishers)
            .values({ name, description: publisherDescription(name) })
            .returning({ id: publishers.id });
        map.set(name, row.id);
    }
    return map;
}

/**
 * Seed the database from the games CSV. Idempotent: skips existing games by title.
 *
 * @param db - Injectable database client.
 * @param csvPath - Path to the seed CSV file; defaults to `db/games.csv`.
 * @returns Resolves once all missing categories, publishers, and games are inserted.
 */
export async function seedDatabase(db: Database, csvPath: string = join(here, 'games.csv')): Promise<void> {
    const rows = parseGamesCsv(readFileSync(csvPath, 'utf-8'));

    const categoryIds = await upsertCategories(db, uniqueCategories(rows));
    const publisherIds = await upsertPublishers(db, uniquePublishers(rows));

    for (const row of rows) {
        const existing = await db.select().from(games).where(eq(games.title, row.title)).limit(1);
        if (existing.length > 0) {
            continue;
        }
        await db.insert(games).values({
            title: row.title,
            description: gameDescription(row.description),
            starRating: ratingFromTitle(row.title),
            categoryId: categoryIds.get(row.category)!,
            publisherId: publisherIds.get(row.publisher)!,
        });
    }
}

// Allow running directly: `tsx db/seed.ts`
// pathToFileURL normalises Windows backslashes and slash count, making the
// comparison safe on all platforms when invoked via `tsx db/seed.ts`.
if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    const db = createDatabase();
    seedDatabase(db)
        .then(() => {
            console.log('Database seeded.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Seeding failed:', error);
            process.exit(1);
        });
}
