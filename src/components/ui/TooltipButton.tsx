import React, { useId, useState, type ReactNode } from 'react';

interface TooltipButtonProps {
    onClick?: () => void;
    icon: ReactNode;
    tooltip: string;
    ariaLabel: string;
    type?: 'button' | 'submit';
    href?: string;
    target?: string;
    rel?: string;
    className?: string;
}

const baseButtonClasses = "p-2 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-colors text-text-muted hover:text-primary flex items-center justify-center";

export const TooltipButton: React.FC<TooltipButtonProps> = ({
    onClick,
    icon,
    tooltip,
    ariaLabel,
    type = 'button',
    href,
    target,
    rel,
    className = '',
}) => {
    const tooltipId = useId();
    // Escape hides a tooltip the pointer or the keyboard is still sitting on
    // (WCAG 1.4.13). The next hover or focus arms it again.
    const [dismissed, setDismissed] = useState(false);
    const combinedClasses = `${baseButtonClasses} ${className}`.trim();
    // Plenty of callers pass the same string as label and tooltip. Pointing a
    // description at it too would have the screen reader read it out twice.
    const describedBy = ariaLabel === tooltip ? undefined : tooltipId;

    const renderElement = () => {
        if (href) {
            return (
                <a
                    href={href}
                    target={target}
                    rel={rel}
                    className={combinedClasses}
                    aria-label={ariaLabel}
                    aria-describedby={describedBy}
                >
                    {icon}
                </a>
            );
        }
        if (onClick) {
            return (
                <button
                    type={type}
                    onClick={onClick}
                    className={combinedClasses}
                    aria-label={ariaLabel}
                    aria-describedby={describedBy}
                >
                    {icon}
                </button>
            );
        }
        // Info icons carry no action, but a tooltip that cannot take focus is
        // one only pointer users ever get to read — and on touch, where there
        // is no hover, nobody does. A real button is focusable without a
        // tabIndex; role="img" would describe neither the element nor what
        // focusing it does. cursor-help keeps the pointer from promising a
        // click that leads nowhere.
        return (
            <button
                type="button"
                className={`${combinedClasses} cursor-help`}
                aria-label={ariaLabel}
                aria-describedby={describedBy}
            >
                {icon}
            </button>
        );
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Focus sits inside the container whenever this handler runs, so the
        // tooltip is on screen unless it was already dismissed. Swallow that
        // first Escape: dialogs and popovers listen for it on document, and
        // closing one out from under the user is not what the press asked for.
        // A second press reaches them.
        if (e.key === 'Escape' && !dismissed) {
            setDismissed(true);
            e.stopPropagation();
        }
    };

    const arm = () => setDismissed(false);

    return (
        <div
            className={`tooltip-container${dismissed ? ' tooltip-dismissed' : ''}`}
            onKeyDown={handleKeyDown}
            onFocus={arm}
            onBlur={arm}
            onMouseEnter={arm}
            onMouseLeave={arm}
        >
            {renderElement()}
            <div id={tooltipId} role="tooltip" className="tooltip-text">
                {tooltip}
            </div>
        </div>
    );
};

TooltipButton.displayName = 'TooltipButton';
