
import React from 'react';
import { ShoppingCart, Share2, ExternalLink } from 'lucide-react';
import type { Ingredient } from '../services/llm';
import { translations } from '../constants/translations';

interface ShoppingListProps {
    items: Ingredient[];
    language: string;
}

export const ShoppingList: React.FC<ShoppingListProps> = ({ items, language }) => {
    const t = translations[language as keyof typeof translations];

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
        <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <ShoppingCart className="text-[var(--color-secondary)]" size={24} />
                    <h2>{t.shoppingList}</h2>
                </div>
                <div className="flex gap-2">
                    <a
                        href={shareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-colors focus:opacity-100 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                        title="Open in new tab"
                    >
                        <ExternalLink size={18} />
                    </a>
                    <button
                        onClick={handleShare}
                        className="p-2 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-colors focus:opacity-100 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                        title="Share Shopping List"
                    >
                        <Share2 size={18} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/40 dark:bg-black/20 rounded-lg border border-[var(--color-border)]" style={{ padding: '1rem' }}>
                        <div className="flex items-center gap-3">
                            <input type="checkbox" className="w-5 h-5 accent-[var(--color-primary)] rounded cursor-pointer" />
                            <span className="font-medium">{item.item}</span>
                        </div>
                        <span className="text-sm text-[var(--color-text-muted)] bg-white/50 dark:bg-black/30 rounded text-right" style={{ padding: '0.25rem 0.75rem' }}>
                            {item.amount}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
