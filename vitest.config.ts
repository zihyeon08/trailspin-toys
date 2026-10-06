/// <reference types="vitest/config"/>
import { getViteConfig } from 'astro/config';

export default getViteConfig({
    test: {
        include: ['db/**/*.test.ts', 'src/**/*.test.ts'],
        environment: 'node',
    },
});
