import React, { type ReactNode } from 'react';
import { ChevronUp, ChevronDown, Info } from 'lucide-react';
import { TooltipButton } from './TooltipButton';

interface PanelHeaderProps {
    icon: ReactNode;
    title: string;
    isMinimized: boolean;
    onToggleMinimize: () => void;
    infoTooltip?: string;
    infoAriaLabel?: string;
    actions?: ReactNode;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
    icon,
    title,
    isMinimized,
    onToggleMinimize,
    infoTooltip,
    infoAriaLabel,
    actions,
}) => {
    return (
        <div className="flex flex-row items-center justify-between">
            <div className="flex flex-row items-center gap-3">
                {icon}
                <h2>{title}</h2>
            </div>
            <div className="flex items-center gap-2">
                {actions}
                {infoTooltip && (
                    <TooltipButton
                        icon={<Info size={18} />}
                        tooltip={infoTooltip}
                        ariaLabel={infoAriaLabel || 'Info'}
                    />
                )}
                <button
                    onClick={onToggleMinimize}
                    className="p-2 bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 rounded-full transition-colors text-text-muted hover:text-primary flex items-center justify-center"
                    aria-label={isMinimized ? 'Expand' : 'Collapse'}
                    aria-expanded={!isMinimized}
                >
                    {isMinimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </button>
            </div>
        </div>
    );
};

PanelHeader.displayName = 'PanelHeader';
