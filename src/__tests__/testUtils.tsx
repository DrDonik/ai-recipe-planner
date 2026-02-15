import { render } from '@testing-library/react';
import { SettingsProvider } from '../contexts/SettingsContext';

/**
 * Renders a component wrapped in SettingsProvider for testing.
 * This helper ensures components have access to the settings context.
 */
export const renderWithSettings = (ui: React.ReactElement) => {
    return render(<SettingsProvider>{ui}</SettingsProvider>);
};
