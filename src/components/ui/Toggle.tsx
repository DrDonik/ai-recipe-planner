import React from 'react';

interface ToggleProps {
    icon: React.ReactNode;
    label: string;
    checked: boolean;
    onChange: () => void;
    /** Status or detail affordance for the row's trailing column. */
    trailing?: React.ReactNode;
    ariaLabel?: string;
    /** Set when flipping the switch opens a dialog instead of committing. */
    opensDialog?: boolean;
}

/**
 * One row of the header's settings grid: icon, label, switch, trailing slot.
 *
 * Renders as `display: contents` so those four elements become direct children
 * of the parent grid — that is what keeps labels and switches lined up across
 * rows of differing label length.
 */
export const Toggle: React.FC<ToggleProps> = ({
    icon,
    label,
    checked,
    onChange,
    trailing,
    ariaLabel,
    opensDialog,
}) => (
    <div className="contents">
        <span className="text-text-muted justify-self-center" aria-hidden="true">{icon}</span>
        <span className={`text-sm transition-colors ${checked ? 'text-text-main font-medium' : 'text-text-muted'}`}>
            {label}
        </span>
        <button
            onClick={onChange}
            className="relative w-12 h-6 bg-white/50 dark:bg-black/30 rounded-full border border-[var(--glass-border)] transition-colors hover:bg-white/70 dark:hover:bg-black/40"
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel ?? label}
            aria-haspopup={opensDialog ? 'dialog' : undefined}
        >
            <span
                className={`absolute top-0.5 w-5 h-5 bg-primary rounded-full shadow-md transition-all duration-200 ${checked ? 'left-6' : 'left-0.5'}`}
            />
        </button>
        <span className="flex items-center">{trailing}</span>
    </div>
);
