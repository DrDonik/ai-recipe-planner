import { z } from 'zod';
import { STORAGE_KEYS } from '../constants';
import { MealPlanSchema } from '../services/llm';

/**
 * Schema version for forward compatibility.
 * Bump when the export format changes in a breaking way.
 */
const EXPORT_VERSION = 1;

/**
 * Keys to include in the export. Deliberately excludes:
 * - API key (security)
 * - API key warning seen (security state)
 * - UI collapse states (device-specific)
 * - Welcome dismissed (should show on new device)
 * - Shared shopping list checked (ephemeral)
 */
const EXPORTABLE_KEYS = [
    STORAGE_KEYS.PANTRY_ITEMS,
    STORAGE_KEYS.SPICE_RACK,
    STORAGE_KEYS.MEAL_PLAN,
    STORAGE_KEYS.SHOPPING_LIST_CHECKED,
    STORAGE_KEYS.PEOPLE_COUNT,
    STORAGE_KEYS.MEALS_COUNT,
    STORAGE_KEYS.DIET_PREFERENCE,
    STORAGE_KEYS.STYLE_WISHES,
    STORAGE_KEYS.LANGUAGE,
    STORAGE_KEYS.USE_COPY_PASTE,
] as const;

/**
 * Zod schema for validating imported data.
 */
const PantryItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    amount: z.string(),
});

const ExportDataSchema = z.object({
    version: z.number(),
    exportedAt: z.string(),
    data: z.object({
        [STORAGE_KEYS.PANTRY_ITEMS]: z.array(PantryItemSchema).optional(),
        [STORAGE_KEYS.SPICE_RACK]: z.array(z.string()).optional(),
        [STORAGE_KEYS.MEAL_PLAN]: MealPlanSchema.nullable().optional(),
        [STORAGE_KEYS.SHOPPING_LIST_CHECKED]: z.record(z.string(), z.boolean()).optional(),
        [STORAGE_KEYS.PEOPLE_COUNT]: z.number().optional(),
        [STORAGE_KEYS.MEALS_COUNT]: z.number().optional(),
        [STORAGE_KEYS.DIET_PREFERENCE]: z.string().optional(),
        [STORAGE_KEYS.STYLE_WISHES]: z.array(z.string()).optional(),
        [STORAGE_KEYS.LANGUAGE]: z.string().optional(),
        [STORAGE_KEYS.USE_COPY_PASTE]: z.boolean().optional(),
    }),
});

export type ExportData = z.infer<typeof ExportDataSchema>;

/**
 * Collects exportable data from localStorage into a structured object.
 */
export const buildExportData = (): ExportData => {
    const data: Record<string, unknown> = {};

    for (const key of EXPORTABLE_KEYS) {
        const raw = localStorage.getItem(key);
        if (raw === null) continue;

        data[key] = JSON.parse(raw);
    }

    return {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        data,
    };
};

/**
 * Triggers a JSON file download in the browser.
 */
export const downloadExportFile = (exportData: ExportData): void => {
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const date = new Date().toISOString().slice(0, 10);
    const filename = `recipe-planner-backup-${date}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
};

/**
 * Reads and validates a JSON file selected by the user.
 * Returns the validated export data, or throws an error with a user-facing message.
 */
export const readImportFile = (file: File): Promise<ExportData> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            try {
                const parsed = JSON.parse(reader.result as string);
                const validated = ExportDataSchema.parse(parsed);
                resolve(validated);
            } catch (error) {
                if (error instanceof z.ZodError) {
                    reject(new Error('invalidImportStructure'));
                } else if (error instanceof SyntaxError) {
                    reject(new Error('invalidImportJson'));
                } else {
                    reject(error);
                }
            }
        };

        reader.onerror = () => {
            reject(new Error('importReadError'));
        };

        reader.readAsText(file);
    });
};

/**
 * Writes validated import data into localStorage, overwriting existing values.
 * Does NOT touch API key or UI state keys.
 */
export const applyImportData = (exportData: ExportData): void => {
    for (const key of EXPORTABLE_KEYS) {
        const value = exportData.data[key as keyof typeof exportData.data];
        if (value === undefined) {
            // Key not present in import — remove from localStorage
            localStorage.removeItem(key);
            continue;
        }

        localStorage.setItem(key, JSON.stringify(value));
    }
};
