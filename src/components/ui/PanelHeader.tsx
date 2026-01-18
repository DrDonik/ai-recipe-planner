import React, { type ReactNode } from 'react';
import { ChevronUp, ChevronDown, Info } from 'lucide-react';
import { TooltipButton } from './TooltipButton';

interface PanelHeaderProps {
    icon: ReactNode;
    title: string;
    isMinimized: boolean;
    onToggleMinimize: () => void;
    minimizeLabel: string;
    expandLabel: string;
    infoTooltip?: string;
    infoAriaLabel?: string;
    actions?: ReactNode;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
    icon,
    title,
    isMinimized,
    onToggleMinimize,
    minimizeLabel,
    expandLabel,
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
                <TooltipButton
                    onClick={onToggleMinimize}
                    icon={isMinimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    tooltip={isMinimized ? expandLabel : minimizeLabel}
                    ariaLabel={isMinimized ? expandLabel : minimizeLabel}
                />
            </div>
        </div>
    );
};

PanelHeader.displayName = 'PanelHeader';
