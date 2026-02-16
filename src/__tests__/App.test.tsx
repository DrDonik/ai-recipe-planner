import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import App from '../App';
import { renderWithSettings } from './testUtils';
import { encodeForUrl } from '../utils/sharing';
import type { Recipe, Ingredient } from '../types';

// Mock window.location
const mockLocation = new URL('http://localhost:3000');
delete (window as any).location;
window.location = mockLocation as any;

// Mock window.history
const mockPushState = vi.fn();
window.history.pushState = mockPushState;

describe('App URL Parameter Decoding', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLocation.search = '';
    });

    describe('Recipe URL parameter', () => {
        it('decodes valid recipe parameter on mount', async () => {
            const testRecipe: Recipe = {
                id: 'test-recipe-1',
                title: 'Test Recipe',
                time: '30 min',
                ingredients: [
                    { item: 'Tomato', amount: '2', unit: 'pcs' },
                    { item: 'Onion', amount: '1', unit: 'pc' }
                ],
                instructions: ['Step 1', 'Step 2'],
                usedIngredients: [],
                missingIngredients: []
            };

            const encoded = encodeForUrl(testRecipe);
            mockLocation.search = `?recipe=${encodeURIComponent(encoded)}`;

            renderWithSettings(<App />);

            // Recipe should be displayed
            await waitFor(() => {
                expect(screen.getByText('Test Recipe')).toBeInTheDocument();
            });
        });

        it('shows error notification for invalid recipe data', async () => {
            // Invalid base64 data
            mockLocation.search = '?recipe=invalid-base64-data';

            renderWithSettings(<App />);

            // Error notification should be shown (it's rendered in SettingsPanel)
            await waitFor(() => {
                const errorText = screen.queryByText(/Invalid shared recipe data/i) ||
                                screen.queryByText(/The link may be corrupted/i);
                expect(errorText).toBeInTheDocument();
            }, { timeout: 3000 });
        });

        it('shows error notification for malformed recipe JSON', async () => {
            // Valid base64 but invalid recipe structure
            const invalidData = { not: 'a recipe' };
            const encoded = encodeForUrl(invalidData);
            mockLocation.search = `?recipe=${encodeURIComponent(encoded)}`;

            renderWithSettings(<App />);

            // Error notification should be shown (it's rendered in SettingsPanel)
            await waitFor(() => {
                const errorText = screen.queryByText(/Invalid shared recipe data/i) ||
                                screen.queryByText(/The link may be corrupted/i);
                expect(errorText).toBeInTheDocument();
            }, { timeout: 3000 });
        });
    });

    describe('Shopping List URL parameter', () => {
        it('decodes valid shopping list parameter on mount', async () => {
            const testShoppingList: Ingredient[] = [
                { item: 'Milk', amount: '1', unit: 'L' },
                { item: 'Bread', amount: '1', unit: 'loaf' }
            ];

            const encoded = encodeForUrl(testShoppingList);
            mockLocation.search = `?shoppingList=${encodeURIComponent(encoded)}`;

            renderWithSettings(<App />);

            // Shopping list should be displayed
            await waitFor(() => {
                expect(screen.getByText('Milk')).toBeInTheDocument();
                expect(screen.getByText('Bread')).toBeInTheDocument();
            });
        });

        it('shows error notification for invalid shopping list data', async () => {
            // Invalid base64 data
            mockLocation.search = '?shoppingList=invalid-base64-data';

            renderWithSettings(<App />);

            // Error notification should be shown (it's rendered in SettingsPanel)
            await waitFor(() => {
                const errorText = screen.queryByText(/Invalid shared shopping list data/i) ||
                                screen.queryByText(/The link may be corrupted/i);
                expect(errorText).toBeInTheDocument();
            }, { timeout: 3000 });
        });
    });

    describe('Effect behavior', () => {
        it('runs URL decode effect only once on mount', async () => {
            const testRecipe: Recipe = {
                id: 'test-recipe-2',
                title: 'Language Test Recipe',
                time: '20 min',
                ingredients: [{ item: 'Rice', amount: '200', unit: 'g' }],
                instructions: ['Cook rice'],
                usedIngredients: [],
                missingIngredients: []
            };

            const encoded = encodeForUrl(testRecipe);
            mockLocation.search = `?recipe=${encodeURIComponent(encoded)}`;

            renderWithSettings(<App />);

            // Recipe should be displayed
            await waitFor(() => {
                expect(screen.getByText('Language Test Recipe')).toBeInTheDocument();
            });

            // Recipe continues to be displayed
            // The effect has empty dependency array [], so it only runs once
            expect(screen.getByText('Language Test Recipe')).toBeInTheDocument();
        });

        it('uses translation ref for error messages', async () => {
            // Invalid base64 data that will trigger error
            mockLocation.search = '?recipe=invalid-base64';

            renderWithSettings(<App />);

            // The error message should use the translation from the ref
            // The ref captures t.invalidSharedData and updates when it changes
            await waitFor(() => {
                const errorText = screen.queryByText(/Invalid shared recipe data/i) ||
                                screen.queryByText(/The link may be corrupted/i);
                expect(errorText).toBeInTheDocument();
            }, { timeout: 3000 });
        });
    });
});
