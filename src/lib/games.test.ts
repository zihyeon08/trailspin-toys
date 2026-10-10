import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getAllCategories,
    getAllPublishers,
    getGameById,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('filters by one or more categories and a publisher', async () => {
        const [strategy] = await db
            .insert(categories)
            .values({ name: 'Strategy', description: 'cat' })
            .returning({ id: categories.id });
        const [puzzle] = await db
            .insert(categories)
            .values({ name: 'Puzzle', description: 'cat' })
            .returning({ id: categories.id });
        const [firstPublisher] = await db
            .insert(publishers)
            .values({ name: 'Pub One', description: 'pub' })
            .returning({ id: publishers.id });
        const [secondPublisher] = await db
            .insert(publishers)
            .values({ name: 'Pub Two', description: 'pub' })
            .returning({ id: publishers.id });

        await db.insert(games).values([
            { title: 'Strategy One', description: 'desc', starRating: 4, categoryId: strategy.id, publisherId: firstPublisher.id },
            { title: 'Puzzle One', description: 'desc', starRating: 4, categoryId: puzzle.id, publisherId: firstPublisher.id },
            { title: 'Strategy Two', description: 'desc', starRating: 4, categoryId: strategy.id, publisherId: secondPublisher.id },
        ]);

        const filtered = await getAllGames(db, {
            categoryIds: [strategy.id, puzzle.id],
            publisherId: firstPublisher.id,
        });

        expect(filtered.map((game) => game.title)).toEqual(['Puzzle One', 'Strategy One']);
    });

    it('returns filter options ordered by name', async () => {
        await db.insert(categories).values([
            { name: 'Zeta', description: 'cat' },
            { name: 'Alpha', description: 'cat' },
        ]);
        await db.insert(publishers).values([
            { name: 'Zeta Pub', description: 'pub' },
            { name: 'Alpha Pub', description: 'pub' },
        ]);

        expect((await getAllCategories(db)).map((item) => item.name)).toEqual(['Alpha', 'Zeta']);
        expect((await getAllPublishers(db)).map((item) => item.name)).toEqual(['Alpha Pub', 'Zeta Pub']);
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });
});
