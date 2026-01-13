
import React, { useState, useEffect } from 'react';
import { ShoppingCart, Share2, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';
import type { Ingredient } from '../services/llm';
import { translations } from '../constants/translations';

interface ShoppingListProps {
    items: Ingredient[];
    language: string;
    isMinimized?: boolean;
    onToggleMinimize?: () => void;
    isStandaloneView?: boolean;
}

export const ShoppingList: React.FC<ShoppingListProps> = ({ items, language, isMinimized = false, onToggleMinimize, isStandaloneView = false }) => {
    const t = translations[language as keyof typeof translations];

    // Load checked items from localStorage
    const [checkedItems, setCheckedItems] = useState<Set<string>>(() => {
        try {
            const saved = localStorage.getItem('shopping_list_checked');
            return saved ? new Set(JSON.parse(saved)) : new Set();
        } catch {
            return new Set();
        }
    });

    // Save checked items to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('shopping_list_checked', JSON.stringify(Array.from(checkedItems)));
    }, [checkedItems]);

    // Generate a unique key for each item (using item name + amount)
    const getItemKey = (item: Ingredient) => `${item.item}|${item.amount}`;

    const toggleItem = (itemKey: string) => {
        setCheckedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemKey)) {
                newSet.delete(itemKey);
            } else {
                newSet.add(itemKey);
            }
            return newSet;
        });
    };

    if (items.length === 0) return null;

    // Generate URL for sharing and external link
    const json = JSON.stringify(items);
    // UTF-8 friendly base64 encoding
    const base64 = btoa(unescape(encodeURIComponent(json)));
    // Fix: encodeURIComponent because base64 can contain '+' which URLSearchParams treats as space
    const shareUrl = `${window.location.origin}${window.location.pathname}?shoppingList=${encodeURIComponent(base64)}`;

    const handleShare = async () => {
        // 1. Try Web Share API (Mobile/Modern)
        if (navigator.share) {
            try {
                await navigator.share({
                    title: t.shoppingList,
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
                if (btn) setTimeout(() => btn.title = originalTitle || "Share Shopping List", 2000);
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
        <div className={`glass-panel ${isMinimized ? 'p-6 pb-6' : 'p-6'}`}>
            <div className={`flex items-center justify-between ${isMinimized ? 'mb-0' : 'mb-5'}`}>
                <div className="flex items-center gap-3">
                    <ShoppingCart className="text-[var(--color-secondary)]" size={24} />
                    <h2>{t.shoppingList}</h2>
                </div>
                <div className="flex gap-2">
                    {!isStandaloneView && (
                        <a
                            href={shareUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-colors focus:opacity-100 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                            title="Open in new tab"
                        >
                            <ExternalLink size={18} />
                        </a>
                    )}
                    <button
                        onClick={handleShare}
                        className="p-2 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-colors focus:opacity-100 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                        title="Share Shopping List"
                    >
                        <Share2 size={18} />
                    </button>
                    {onToggleMinimize && (
                        <div className="tooltip-container">
                            <button
                                onClick={onToggleMinimize}
                                className="p-2 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-colors focus:opacity-100 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                                aria-label={isMinimized ? t.shoppingListExpand : t.shoppingListMinimize}
                            >
                                {isMinimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                            </button>
                            <div className="tooltip-text">
                                {isMinimized ? t.shoppingListExpand : t.shoppingListMinimize}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {!isMinimized && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {items.map((item, i) => {
                    const itemKey = getItemKey(item);
                    const isChecked = checkedItems.has(itemKey);
                    return (
                        <div key={i} className="flex items-center justify-between bg-white/40 dark:bg-black/20 rounded-lg border border-[var(--color-border)]" style={{ padding: '1rem' }}>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleItem(itemKey)}
                                    className="w-5 h-5 accent-[var(--color-primary)] rounded cursor-pointer"
                                />
                                <span className={`font-medium ${isChecked ? 'line-through text-[var(--color-text-muted)]' : ''}`}>{item.item}</span>
                            </div>
                            <span className="text-sm text-[var(--color-text-muted)] bg-white/50 dark:bg-black/30 rounded text-right" style={{ padding: '0.25rem 0.75rem' }}>
                                {item.amount}
                            </span>
                        </div>
                    );
                })}
                </div>
            )}
        </div>
    );
};
