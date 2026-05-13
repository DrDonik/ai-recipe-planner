import type { Notification } from '../../types';

interface UndoToastProps {
    notification: Notification;
}

const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const isUrl = (part: string) => /^https?:\/\/[^\s]+$/.test(part);
    return text.split(urlRegex).map((part, index) => {
        if (isUrl(part)) {
            return (
                <a
                    key={index}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-red-800 transition-colors"
                >
                    {part}
                </a>
            );
        }
        return <span key={index}>{part}</span>;
    });
};

export const UndoToast = ({ notification }: UndoToastProps) => (
    <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className={`p-4 rounded-xl border text-sm animate-in fade-in slide-in-from-top-2 flex items-center justify-between gap-3 ${
            notification.type === 'error'
                ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900'
                : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
        }`}
    >
        <span className="flex-1">{renderTextWithLinks(notification.message)}</span>
        {notification.action && (
            <button
                onClick={notification.action.onClick}
                aria-label={notification.action.ariaLabel || notification.action.label}
                className={`px-3 py-1 rounded-lg font-medium text-sm transition-colors shrink-0 ${
                    notification.type === 'error'
                        ? 'bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800'
                        : 'bg-amber-200 hover:bg-amber-300 dark:bg-amber-800 dark:hover:bg-amber-700'
                }`}
            >
                {notification.action.label}
            </button>
        )}
    </div>
);
