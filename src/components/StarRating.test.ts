import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, it, expect } from 'vitest';
import StarRating from './StarRating.astro';

/**
 * Renders `StarRating.astro` directly (via Astro's Container API) so the
 * null-rating branch - used by both the game card (list page) and the game
 * details page - is actually exercised. Seed data always derives a numeric
 * rating via `ratingFromTitle`, so an e2e pass alone can never hit this path.
 */
describe('StarRating', () => {
    it('renders a "No rating yet" badge when rating is null', async () => {
        const container = await AstroContainer.create();
        const result = await container.renderToString(StarRating, {
            props: { rating: null },
        });

        expect(result).toContain('data-testid="game-rating"');
        expect(result).toContain('No rating yet');
    });

    it('renders the formatted stars and numeric value for a non-null rating', async () => {
        const container = await AstroContainer.create();
        const result = await container.renderToString(StarRating, {
            props: { rating: 3.5 },
        });

        expect(result).toContain('data-testid="game-rating"');
        expect(result).toContain('★★★½☆');
        expect(result).toContain('3.5');
        expect(result).not.toContain('No rating yet');
    });
});
