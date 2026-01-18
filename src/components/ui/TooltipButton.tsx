import React, { type ReactNode } from 'react';

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
    const combinedClasses = `${baseButtonClasses} ${className}`.trim();

    return (
        <div className="tooltip-container">
            {href ? (
                <a
                    href={href}
                    target={target}
                    rel={rel}
                    className={combinedClasses}
                    aria-label={ariaLabel}
                >
                    {icon}
                </a>
            ) : (
                <button
                    type={type}
                    onClick={onClick}
                    className={combinedClasses}
                    aria-label={ariaLabel}
                >
                    {icon}
                </button>
            )}
            <div className="tooltip-text">
                {tooltip}
            </div>
        </div>
    );
};

TooltipButton.displayName = 'TooltipButton';
