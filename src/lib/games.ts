import { eq, asc } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

/**
 * Maps a joined games/categories/publishers selection row into the
 * app-facing {@link Game} shape, nulling out category/publisher when the
 * left join found no match.
 *
 * @param row - Raw row returned by {@link baseGamesQuery}.
 * @returns The mapped, app-facing game.
 */
function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

/**
 * Shared base query joining games to their category and publisher.
 *
 * @param db - Injectable database client.
 * @returns A Drizzle query builder ready for further `where`/`orderBy` clauses.
 */
function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

/**
 * All games ordered by title.
 *
 * @param db - Injectable database client.
 * @returns All games with their category and publisher, ordered by title.
 */
export async function getAllGames(db: Database): Promise<Game[]> {
    const rows = await baseGamesQuery(db).orderBy(asc(games.title));
    return rows.map(mapGame);
}

/**
 * All game ids ordered by title.
 *
 * @param db - Injectable database client.
 * @returns Game ids in title order, used by `getStaticPaths()`.
 */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/**
 * A single game by id, or null when it does not exist.
 *
 * @param db - Injectable database client.
 * @param id - Game id to look up.
 * @returns The matching game, or `null` if no game has that id.
 */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}
