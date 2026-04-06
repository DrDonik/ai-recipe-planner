import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildExportData, downloadExportFile, readImportFile, applyImportData, type ExportData } from '../../utils/dataTransfer';
import { STORAGE_KEYS } from '../../constants';

describe('dataTransfer utilities', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('buildExportData', () => {
        it('should return version and exportedAt fields', () => {
            const result = buildExportData();

            expect(result.version).toBe(1);
            expect(result.exportedAt).toBeTruthy();
            expect(() => new Date(result.exportedAt)).not.toThrow();
            expect(result.data).toBeDefined();
        });

        it('should include pantry items from localStorage', () => {
            const pantry = [{ id: '1', name: 'Carrots', amount: '1kg' }];
            localStorage.setItem(STORAGE_KEYS.PANTRY_ITEMS, JSON.stringify(pantry));

            const result = buildExportData();

            expect(result.data[STORAGE_KEYS.PANTRY_ITEMS]).toEqual(pantry);
        });

        it('should include spice rack items', () => {
            const spices = ['Salt', 'Pepper', 'Olive Oil'];
            localStorage.setItem(STORAGE_KEYS.SPICE_RACK, JSON.stringify(spices));

            const result = buildExportData();

            expect(result.data[STORAGE_KEYS.SPICE_RACK]).toEqual(spices);
        });

        it('should include meal plan', () => {
            const mealPlan = {
                recipes: [{
                    id: 'r1',
                    title: 'Test Recipe',
                    time: '30 min',
                    ingredients: [{ item: 'Carrot', amount: '2', unit: 'pcs' }],
                    instructions: ['Step 1', 'Step 2'],
                    usedIngredients: ['1'],
                }],
                shoppingList: [{ item: 'Onion', amount: '3', unit: 'pcs' }],
            };
            localStorage.setItem(STORAGE_KEYS.MEAL_PLAN, JSON.stringify(mealPlan));

            const result = buildExportData();

            expect(result.data[STORAGE_KEYS.MEAL_PLAN]).toEqual(mealPlan);
        });

        it('should include settings (people, meals, diet, styleWishes, language)', () => {
            localStorage.setItem(STORAGE_KEYS.PEOPLE_COUNT, JSON.stringify(4));
            localStorage.setItem(STORAGE_KEYS.MEALS_COUNT, JSON.stringify(5));
            localStorage.setItem(STORAGE_KEYS.DIET_PREFERENCE, JSON.stringify('Vegan'));
            localStorage.setItem(STORAGE_KEYS.STYLE_WISHES, JSON.stringify(['Indian', 'Spicy']));
            localStorage.setItem(STORAGE_KEYS.LANGUAGE, JSON.stringify('German'));

            const result = buildExportData();

            expect(result.data[STORAGE_KEYS.PEOPLE_COUNT]).toBe(4);
            expect(result.data[STORAGE_KEYS.MEALS_COUNT]).toBe(5);
            expect(result.data[STORAGE_KEYS.DIET_PREFERENCE]).toBe('Vegan');
            expect(result.data[STORAGE_KEYS.STYLE_WISHES]).toEqual(['Indian', 'Spicy']);
            expect(result.data[STORAGE_KEYS.LANGUAGE]).toBe('German');
        });

        it('should include use_copy_paste and shopping list checked state', () => {
            localStorage.setItem(STORAGE_KEYS.USE_COPY_PASTE, JSON.stringify(false));
            localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST_CHECKED, JSON.stringify(['item-1|100g']));

            const result = buildExportData();

            expect(result.data[STORAGE_KEYS.USE_COPY_PASTE]).toBe(false);
            expect(result.data[STORAGE_KEYS.SHOPPING_LIST_CHECKED]).toEqual(['item-1|100g']);
        });

        it('should include kitchen appliances', () => {
            localStorage.setItem(STORAGE_KEYS.KITCHEN_APPLIANCES, JSON.stringify(['Oven', 'Blender']));

            const result = buildExportData();

            expect(result.data[STORAGE_KEYS.KITCHEN_APPLIANCES]).toEqual(['Oven', 'Blender']);
        });

        it('should NOT include API key', () => {
            localStorage.setItem(STORAGE_KEYS.API_KEY, 'secret-key-123');

            const result = buildExportData();

            expect(result.data).not.toHaveProperty(STORAGE_KEYS.API_KEY);
        });

        it('should NOT include UI minimize states', () => {
            localStorage.setItem(STORAGE_KEYS.HEADER_MINIMIZED, JSON.stringify(true));
            localStorage.setItem(STORAGE_KEYS.OPTIONS_MINIMIZED, JSON.stringify(true));
            localStorage.setItem(STORAGE_KEYS.PANTRY_MINIMIZED, JSON.stringify(false));

            const result = buildExportData();

            expect(result.data).not.toHaveProperty(STORAGE_KEYS.HEADER_MINIMIZED);
            expect(result.data).not.toHaveProperty(STORAGE_KEYS.OPTIONS_MINIMIZED);
            expect(result.data).not.toHaveProperty(STORAGE_KEYS.PANTRY_MINIMIZED);
        });

        it('should NOT include welcome_dismissed or api_key_warning_seen', () => {
            localStorage.setItem(STORAGE_KEYS.WELCOME_DISMISSED, 'true');
            localStorage.setItem(STORAGE_KEYS.API_KEY_WARNING_SEEN, 'true');

            const result = buildExportData();

            expect(result.data).not.toHaveProperty(STORAGE_KEYS.WELCOME_DISMISSED);
            expect(result.data).not.toHaveProperty(STORAGE_KEYS.API_KEY_WARNING_SEEN);
        });

        it('should handle empty localStorage gracefully', () => {
            const result = buildExportData();

            expect(result.version).toBe(1);
            expect(result.data).toEqual({});
        });

        it('should handle string values stored as JSON', () => {
            localStorage.setItem(STORAGE_KEYS.DIET_PREFERENCE, JSON.stringify('Flexitarian'));
            localStorage.setItem(STORAGE_KEYS.LANGUAGE, JSON.stringify('English'));

            const result = buildExportData();

            expect(result.data[STORAGE_KEYS.DIET_PREFERENCE]).toBe('Flexitarian');
            expect(result.data[STORAGE_KEYS.LANGUAGE]).toBe('English');
        });
    });

    describe('downloadExportFile', () => {
        it('should create a download link and trigger click', () => {
            const createObjectURLMock = vi.fn(() => 'blob:test-url');
            const revokeObjectURLMock = vi.fn();
            vi.stubGlobal('URL', { createObjectURL: createObjectURLMock, revokeObjectURL: revokeObjectURLMock });

            const clickMock = vi.fn();
            vi.spyOn(document, 'createElement').mockReturnValue({
                href: '',
                download: '',
                click: clickMock,
            } as unknown as HTMLAnchorElement);

            const data: ExportData = {
                version: 1,
                exportedAt: '2026-04-06T12:00:00.000Z',
                data: {},
            };

            downloadExportFile(data);

            expect(createObjectURLMock).toHaveBeenCalledWith(expect.any(Blob));
            expect(clickMock).toHaveBeenCalledOnce();
            expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:test-url');
        });
    });

    describe('readImportFile', () => {
        const createFile = (content: string, name = 'backup.json'): File => {
            return new File([content], name, { type: 'application/json' });
        };

        it('should parse and validate a valid export file', async () => {
            const exportData: ExportData = {
                version: 1,
                exportedAt: '2026-04-06T12:00:00.000Z',
                data: {
                    [STORAGE_KEYS.PANTRY_ITEMS]: [{ id: '1', name: 'Apples', amount: '5' }],
                    [STORAGE_KEYS.SPICE_RACK]: ['Cinnamon'],
                    [STORAGE_KEYS.PEOPLE_COUNT]: 3,
                },
            };

            const file = createFile(JSON.stringify(exportData));
            const result = await readImportFile(file);

            expect(result.version).toBe(1);
            expect(result.data[STORAGE_KEYS.PANTRY_ITEMS]).toEqual([{ id: '1', name: 'Apples', amount: '5' }]);
            expect(result.data[STORAGE_KEYS.SPICE_RACK]).toEqual(['Cinnamon']);
            expect(result.data[STORAGE_KEYS.PEOPLE_COUNT]).toBe(3);
        });

        it('should reject invalid JSON', async () => {
            const file = createFile('not valid json {{{');

            await expect(readImportFile(file)).rejects.toThrow('invalidImportJson');
        });

        it('should reject JSON that does not match the schema', async () => {
            const file = createFile(JSON.stringify({ foo: 'bar' }));

            await expect(readImportFile(file)).rejects.toThrow('invalidImportStructure');
        });

        it('should reject if version field is missing', async () => {
            const file = createFile(JSON.stringify({ data: {} }));

            await expect(readImportFile(file)).rejects.toThrow('invalidImportStructure');
        });

        it('should reject if pantry items have wrong structure', async () => {
            const badData = {
                version: 1,
                exportedAt: '2026-04-06T12:00:00.000Z',
                data: {
                    [STORAGE_KEYS.PANTRY_ITEMS]: [{ wrong: 'structure' }],
                },
            };
            const file = createFile(JSON.stringify(badData));

            await expect(readImportFile(file)).rejects.toThrow('invalidImportStructure');
        });

        it('should accept a file with only some data keys present', async () => {
            const partialData: ExportData = {
                version: 1,
                exportedAt: '2026-04-06T12:00:00.000Z',
                data: {
                    [STORAGE_KEYS.LANGUAGE]: 'French',
                },
            };
            const file = createFile(JSON.stringify(partialData));
            const result = await readImportFile(file);

            expect(result.data[STORAGE_KEYS.LANGUAGE]).toBe('French');
            expect(result.data[STORAGE_KEYS.PANTRY_ITEMS]).toBeUndefined();
        });
    });

    describe('applyImportData', () => {
        it('should write all data keys to localStorage', () => {
            const importData: ExportData = {
                version: 1,
                exportedAt: '2026-04-06T12:00:00.000Z',
                data: {
                    [STORAGE_KEYS.PANTRY_ITEMS]: [{ id: '1', name: 'Eggs', amount: '12' }],
                    [STORAGE_KEYS.SPICE_RACK]: ['Salt', 'Pepper'],
                    [STORAGE_KEYS.PEOPLE_COUNT]: 4,
                    [STORAGE_KEYS.MEALS_COUNT]: 2,
                    [STORAGE_KEYS.DIET_PREFERENCE]: 'Vegan',
                    [STORAGE_KEYS.LANGUAGE]: 'German',
                    [STORAGE_KEYS.USE_COPY_PASTE]: true,
                },
            };

            applyImportData(importData);

            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.PANTRY_ITEMS)!)).toEqual([{ id: '1', name: 'Eggs', amount: '12' }]);
            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.SPICE_RACK)!)).toEqual(['Salt', 'Pepper']);
            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.PEOPLE_COUNT)!)).toBe(4);
            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.MEALS_COUNT)!)).toBe(2);
            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.DIET_PREFERENCE)!)).toBe('Vegan');
            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.LANGUAGE)!)).toBe('German');
            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.USE_COPY_PASTE)!)).toBe(true);
        });

        it('should overwrite existing localStorage values', () => {
            localStorage.setItem(STORAGE_KEYS.PANTRY_ITEMS, JSON.stringify([{ id: 'old', name: 'Old', amount: '1' }]));
            localStorage.setItem(STORAGE_KEYS.LANGUAGE, JSON.stringify('English'));

            const importData: ExportData = {
                version: 1,
                exportedAt: '2026-04-06T12:00:00.000Z',
                data: {
                    [STORAGE_KEYS.PANTRY_ITEMS]: [{ id: 'new', name: 'New', amount: '2' }],
                    [STORAGE_KEYS.LANGUAGE]: 'French',
                },
            };

            applyImportData(importData);

            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.PANTRY_ITEMS)!)).toEqual([{ id: 'new', name: 'New', amount: '2' }]);
            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.LANGUAGE)!)).toBe('French');
        });

        it('should remove localStorage keys that are not in the import data', () => {
            localStorage.setItem(STORAGE_KEYS.PANTRY_ITEMS, JSON.stringify([{ id: '1', name: 'Milk', amount: '1L' }]));
            localStorage.setItem(STORAGE_KEYS.SPICE_RACK, JSON.stringify(['Oregano']));

            const importData: ExportData = {
                version: 1,
                exportedAt: '2026-04-06T12:00:00.000Z',
                data: {
                    // Only pantry, no spices — spices should be removed
                    [STORAGE_KEYS.PANTRY_ITEMS]: [{ id: '2', name: 'Butter', amount: '250g' }],
                },
            };

            applyImportData(importData);

            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.PANTRY_ITEMS)!)).toEqual([{ id: '2', name: 'Butter', amount: '250g' }]);
            expect(localStorage.getItem(STORAGE_KEYS.SPICE_RACK)).toBeNull();
        });

        it('should NOT touch API key in localStorage', () => {
            localStorage.setItem(STORAGE_KEYS.API_KEY, 'my-secret-key');

            const importData: ExportData = {
                version: 1,
                exportedAt: '2026-04-06T12:00:00.000Z',
                data: {
                    [STORAGE_KEYS.PANTRY_ITEMS]: [],
                },
            };

            applyImportData(importData);

            // API key should still be there, untouched
            expect(localStorage.getItem(STORAGE_KEYS.API_KEY)).toBe('my-secret-key');
        });

        it('should NOT touch UI minimize states in localStorage', () => {
            localStorage.setItem(STORAGE_KEYS.HEADER_MINIMIZED, JSON.stringify(true));

            const importData: ExportData = {
                version: 1,
                exportedAt: '2026-04-06T12:00:00.000Z',
                data: {},
            };

            applyImportData(importData);

            // UI state should still be there, untouched
            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.HEADER_MINIMIZED)!)).toBe(true);
        });

        it('should handle meal plan with null value', () => {
            localStorage.setItem(STORAGE_KEYS.MEAL_PLAN, JSON.stringify({ recipes: [], shoppingList: [] }));

            const importData: ExportData = {
                version: 1,
                exportedAt: '2026-04-06T12:00:00.000Z',
                data: {
                    [STORAGE_KEYS.MEAL_PLAN]: null,
                },
            };

            applyImportData(importData);

            expect(localStorage.getItem(STORAGE_KEYS.MEAL_PLAN)).toBe('null');
        });
    });

    describe('round-trip: buildExportData → applyImportData', () => {
        it('should preserve all data through export and re-import', () => {
            // Set up realistic localStorage state
            const pantry = [
                { id: 'p1', name: 'Tomatoes', amount: '500g' },
                { id: 'p2', name: 'Pasta', amount: '250g' },
            ];
            const spices = ['Basil', 'Garlic', 'Olive Oil'];
            const mealPlan = {
                recipes: [{
                    id: 'r1',
                    title: 'Pasta al Pomodoro',
                    time: '25 min',
                    ingredients: [
                        { item: 'Tomatoes', amount: '500', unit: 'g' },
                        { item: 'Pasta', amount: '250', unit: 'g' },
                    ],
                    instructions: ['Boil pasta', 'Make sauce', 'Combine'],
                    usedIngredients: ['p1', 'p2'],
                }],
                shoppingList: [{ item: 'Parmesan', amount: '50', unit: 'g' }],
            };

            localStorage.setItem(STORAGE_KEYS.PANTRY_ITEMS, JSON.stringify(pantry));
            localStorage.setItem(STORAGE_KEYS.SPICE_RACK, JSON.stringify(spices));
            localStorage.setItem(STORAGE_KEYS.MEAL_PLAN, JSON.stringify(mealPlan));
            localStorage.setItem(STORAGE_KEYS.PEOPLE_COUNT, JSON.stringify(4));
            localStorage.setItem(STORAGE_KEYS.MEALS_COUNT, JSON.stringify(2));
            localStorage.setItem(STORAGE_KEYS.DIET_PREFERENCE, JSON.stringify('Vegetarian'));
            localStorage.setItem(STORAGE_KEYS.STYLE_WISHES, JSON.stringify(['Italian']));
            localStorage.setItem(STORAGE_KEYS.LANGUAGE, JSON.stringify('German'));
            localStorage.setItem(STORAGE_KEYS.USE_COPY_PASTE, JSON.stringify(true));
            localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST_CHECKED, JSON.stringify(['Parmesan|50g']));
            localStorage.setItem(STORAGE_KEYS.KITCHEN_APPLIANCES, JSON.stringify(['Oven', 'Blender']));

            // Export
            const exported = buildExportData();

            // Clear everything
            localStorage.clear();

            // Re-import
            applyImportData(exported);

            // Verify all data was restored
            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.PANTRY_ITEMS)!)).toEqual(pantry);
            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.SPICE_RACK)!)).toEqual(spices);
            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.MEAL_PLAN)!)).toEqual(mealPlan);
            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.PEOPLE_COUNT)!)).toBe(4);
            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.MEALS_COUNT)!)).toBe(2);
            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.DIET_PREFERENCE)!)).toBe('Vegetarian');
            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.STYLE_WISHES)!)).toEqual(['Italian']);
            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.LANGUAGE)!)).toBe('German');
            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.USE_COPY_PASTE)!)).toBe(true);
            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.SHOPPING_LIST_CHECKED)!)).toEqual(['Parmesan|50g']);
            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.KITCHEN_APPLIANCES)!)).toEqual(['Oven', 'Blender']);
        });
    });
});
