
import React, { useState } from 'react';
import { Plus, Trash2, Refrigerator, Info, Share2, ExternalLink } from 'lucide-react';
import type { PantryItem } from '../services/llm';
import { translations } from '../constants/translations';

import { generateId } from '../utils/idGenerator';

interface PantryInputProps {
    pantryItems: PantryItem[];
    onAddPantryItem: (item: PantryItem) => void;
    onRemovePantryItem: (id: string) => void;
    language: string;
}

export const PantryInput: React.FC<PantryInputProps> = ({
    pantryItems,
    onAddPantryItem,
    onRemovePantryItem,
    language
}) => {
    const t = translations[language as keyof typeof translations];
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !amount.trim()) return;

        onAddPantryItem({
            id: generateId(),
            name: name.trim(),
            amount: amount.trim(),
        });

        setName('');
        setAmount('');
    };

    // Generate URL for sharing and external link
    const json = JSON.stringify(pantryItems);
    // UTF-8 friendly base64 encoding
    const base64 = btoa(unescape(encodeURIComponent(json)));
    // Fix: encodeURIComponent because base64 can contain '+' which URLSearchParams treats as space
    const shareUrl = `${window.location.origin}${window.location.pathname}?pantry=${encodeURIComponent(base64)}`;

    const handleShare = async () => {
        if (pantryItems.length === 0) {
            alert(t.noPantryToShare || 'No pantry items to share!');
            return;
        }

        // 1. Try Web Share API (Mobile/Modern)
        if (navigator.share) {
            try {
                await navigator.share({
                    title: t.pantry,
                    url: shareUrl
                });
                return;
            } catch (err: any) {
                // If user restricted sharing or cancelled, don't show fallback
                if (err.name === 'AbortError' || err.name === 'NotAllowedError') {
                    return;
                }
                console.log('Share API failed, trying clipboard...', err);
            }
        }

        // 2. Try Modern Clipboard API (Secure Contexts)
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(shareUrl);
                // Simple visual feedback
                const btn = document.activeElement as HTMLElement;
                const originalTitle = btn?.title;
                if (btn) btn.title = "Copied!";
                alert("Link copied!");
                if (btn) setTimeout(() => btn.title = originalTitle || "Share Pantry", 2000);
                return;
            }
        } catch (err) {
            console.log('Clipboard API failed, trying legacy...', err);
        }

        // 3. Fallback: Legacy execCommand('copy') (Works in some insecure contexts)
        try {
            const textArea = document.createElement("textarea");
            textArea.value = shareUrl;

            // Ensure it's not visible but part of DOM
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);

            textArea.focus();
            textArea.select();

            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);

            if (successful) {
                alert('Link copied to clipboard!');
                return;
            }
        } catch (err) {
            console.log('Legacy copy failed', err);
        }

        // 4. Ultimate Fallback: window.prompt
        window.prompt('Copy this link to share:', shareUrl);
    };

    return (
        <div className="glass-panel p-10 flex flex-col gap-6">
            <div className="flex flex-row items-center justify-between mb-2">
                <div className="flex flex-row items-center gap-3">
                    <Refrigerator className="text-[var(--color-primary)]" size={24} />
                    <h2>{t.pantry}</h2>
                </div>
                <div className="flex items-center gap-2">
                    {pantryItems.length > 0 && (
                        <>
                            <a
                                href={shareUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-colors flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                                title="Open in new tab"
                            >
                                <ExternalLink size={16} />
                            </a>
                            <button
                                onClick={handleShare}
                                className="p-1.5 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-colors flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                                title="Share Pantry"
                            >
                                <Share2 size={16} />
                            </button>
                        </>
                    )}
                    <div className="tooltip-container">
                        <button
                            type="button"
                            className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors p-1.5 rounded-full outline-none focus:text-[var(--color-primary)]"
                            aria-label="Pantry Info"
                        >
                            <Info size={18} />
                        </button>
                        <div className="tooltip-text">
                            {t.pantryInfo}
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input
                    type="text"
                    placeholder={t.placeholders.ingredient}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field w-full flex-1"
                />
                <input
                    type="text"
                    placeholder={t.placeholders.amount}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input-field w-full"
                />
                <button type="submit" className="btn btn-primary whitespace-nowrap">
                    <Plus size={18} /> {t.add}
                </button>
            </form>

            <div className="grid grid-cols-1 gap-2 mt-2">
                {pantryItems.length === 0 && (
                    <div className="text-[var(--color-text-muted)] text-center py-4 italic">
                        {t.noVeg}
                    </div>
                )}

                {pantryItems.map((item) => (
                    <div key={item.id} className="glass-card flex flex-row items-center justify-between" style={{ padding: '0.75rem' }}>
                        <div className="flex flex-row items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]"></div>
                            <span className="font-semibold">{item.name}</span>
                            <span className="text-[var(--color-text-muted)] text-sm bg-white/50 dark:bg-white/10 rounded-md shadow-sm" style={{ padding: '0.25rem 0.75rem' }}>
                                {item.amount}
                            </span>
                        </div>
                        <button
                            onClick={() => onRemovePantryItem(item.id)}
                            className="btn-icon text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-full p-2"
                            title={t.remove}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
