import { useCallback, useEffect, type Dispatch, type SetStateAction } from 'react';
import type { Kitchen } from '../types';
import { STORAGE_KEYS } from '../constants';
import { useLocalStorage } from './useLocalStorage';
import { generateId } from '../utils/idGenerator';

interface UseKitchensArgs {
    spices: string[];
    appliances: string[];
    setSpices: Dispatch<SetStateAction<string[]>>;
    setAppliances: Dispatch<SetStateAction<string[]>>;
    /** Localized name for the auto-created initial kitchen ("Home"). */
    defaultKitchenName: string;
}

export interface UseKitchensResult {
    kitchens: Kitchen[];
    /** Null only during the very first render, before auto-initialization. */
    activeKitchen: Kitchen | null;
    switchKitchen: (id: string) => void;
    createKitchen: (name: string, copyCurrent: boolean) => void;
    renameKitchen: (id: string, name: string) => void;
    deleteKitchen: (id: string) => void;
    persistError: boolean;
}

/**
 * Manages named kitchen profiles, each bundling a set of staples (spice rack)
 * and appliances.
 *
 * The ACTIVE kitchen's lists remain in the legacy SPICE_RACK and
 * KITCHEN_APPLIANCES storage keys (single source of truth for all existing
 * consumers: LLM prompt, Gist sync, export). The `kitchens` registry stores
 * name + id for every kitchen and snapshots of the lists for INACTIVE
 * kitchens; the active kitchen's snapshot is only refreshed when switching
 * away, so it may be stale while that kitchen is active — never read it then.
 *
 * If the registry is empty (fresh install, pre-1.5.0 data, old sync payload
 * or import), a default kitchen is auto-created around the existing lists.
 */
export const useKitchens = ({
    spices,
    appliances,
    setSpices,
    setAppliances,
    defaultKitchenName,
}: UseKitchensArgs): UseKitchensResult => {
    const [kitchens, setKitchens, kitchensPersistError] = useLocalStorage<Kitchen[]>(STORAGE_KEYS.KITCHENS, []);
    const [activeKitchenId, setActiveKitchenId, activeIdPersistError] = useLocalStorage<string | null>(STORAGE_KEYS.ACTIVE_KITCHEN_ID, null);

    // Self-healing initialization: runs on first use and again whenever an
    // external write (sync pull of an old payload, import of an old file)
    // clears the registry. Guarded so it no-ops once state is consistent.
    useEffect(() => {
        if (kitchens.length === 0) {
            const id = generateId();
            // Functional updates: if a concurrent external write (e.g. the
            // initial sync pull) populated the registry or the active id
            // between render and this effect, keep those values. Any leftover
            // inconsistency is healed by the invalid-id branch below on the
            // effect's next run.
            setKitchens(prev => (prev.length === 0
                ? [{ id, name: defaultKitchenName, spices, appliances }]
                : prev));
            setActiveKitchenId(prev => prev ?? id);
            return;
        }
        if (!kitchens.some(k => k.id === activeKitchenId)) {
            // The stored id points at a kitchen that no longer exists (e.g.
            // it was deleted on another device). Load the fallback kitchen's
            // snapshot instead of adopting the orphaned live lists — adopting
            // them would clobber the fallback's data on the next switch-away.
            const fallback = kitchens[0];
            setActiveKitchenId(fallback.id);
            setSpices(fallback.spices);
            setAppliances(fallback.appliances);
        }
    }, [kitchens, activeKitchenId, spices, appliances, setKitchens, setActiveKitchenId, setSpices, setAppliances, defaultKitchenName]);

    const activeKitchen = kitchens.find(k => k.id === activeKitchenId) ?? kitchens[0] ?? null;
    const activeId = activeKitchen?.id ?? null;

    /** Refreshes the active kitchen's snapshot from the live lists. */
    const withActiveSnapshot = useCallback((list: Kitchen[]): Kitchen[] => {
        return list.map(k => (k.id === activeId ? { ...k, spices, appliances } : k));
    }, [activeId, spices, appliances]);

    const switchKitchen = useCallback((id: string) => {
        if (id === activeId) return;
        const target = kitchens.find(k => k.id === id);
        if (!target) return;
        setKitchens(prev => withActiveSnapshot(prev));
        setActiveKitchenId(id);
        setSpices(target.spices);
        setAppliances(target.appliances);
    }, [activeId, kitchens, withActiveSnapshot, setKitchens, setActiveKitchenId, setSpices, setAppliances]);

    const createKitchen = useCallback((name: string, copyCurrent: boolean) => {
        const id = generateId();
        setKitchens(prev => [
            ...withActiveSnapshot(prev),
            { id, name, spices: copyCurrent ? [...spices] : [], appliances: copyCurrent ? [...appliances] : [] },
        ]);
        setActiveKitchenId(id);
        if (!copyCurrent) {
            setSpices([]);
            setAppliances([]);
        }
    }, [withActiveSnapshot, spices, appliances, setKitchens, setActiveKitchenId, setSpices, setAppliances]);

    const renameKitchen = useCallback((id: string, name: string) => {
        setKitchens(prev => prev.map(k => (k.id === id ? { ...k, name } : k)));
    }, [setKitchens]);

    const deleteKitchen = useCallback((id: string) => {
        if (kitchens.length <= 1) return;
        if (id === activeId) {
            const fallback = kitchens.find(k => k.id !== id);
            if (!fallback) return;
            setActiveKitchenId(fallback.id);
            setSpices(fallback.spices);
            setAppliances(fallback.appliances);
        }
        setKitchens(prev => prev.filter(k => k.id !== id));
    }, [kitchens, activeId, setKitchens, setActiveKitchenId, setSpices, setAppliances]);

    return {
        kitchens,
        activeKitchen,
        switchKitchen,
        createKitchen,
        renameKitchen,
        deleteKitchen,
        persistError: kitchensPersistError || activeIdPersistError,
    };
};
