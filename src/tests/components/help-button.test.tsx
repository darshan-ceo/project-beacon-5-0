import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { screen, waitFor } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { HelpButton } from '@/components/ui/help-button';
import { uiHelpService } from '@/services/uiHelpService';
import { featureFlagService } from '@/services/featureFlagService';

vi.mock('@/services/uiHelpService');
vi.mock('@/services/featureFlagService');

describe('HelpButton', () => {
  const mockHelpData = {
    id: 'button-create-case',
    module: 'cases',
    type: 'button' as const,
    label: 'Create Case',
    explanation: 'Start a new case',
    tooltip: {
      title: 'Create New Case',
      content: 'Open wizard to register new case',
      learnMoreUrl: '/help/cases'
    },
    accessibility: {
      ariaLabel: 'Create a new case',
      keyboardShortcut: 'Ctrl+N'
    }
  };

  beforeEach(() => {
    vi.mocked(featureFlagService.isEnabled).mockReturnValue(true);
    vi.mocked(uiHelpService.getHelp).mockReturnValue(mockHelpData);
  });

  it('should render button with children text', () => {
    render(<HelpButton helpId="button-create-case">Create Case</HelpButton>);

    expect(screen.getByRole('button', { name: /create case/i })).toBeInTheDocument();
  });

  it('should pass button props correctly', () => {
    const handleClick = vi.fn();
    render(
      <HelpButton 
        helpId="button-create-case" 
        onClick={handleClick}
        variant="outline"
        size="sm"
      >
        Create Case
      </HelpButton>
    );

    const button = screen.getByRole('button', { name: /create case/i });
    expect(button).toHaveClass('h-9'); // size="sm" class
  });

  it('should trigger onClick handler', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <HelpButton helpId="button-create-case" onClick={handleClick}>
        Create Case
      </HelpButton>
    );

    await user.click(screen.getByRole('button', { name: /create case/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should render help tooltip icon', () => {
    render(<HelpButton helpId="button-create-case">Create Case</HelpButton>);

    // Help icon should be present
    const helpIcon = screen.getByRole('button', { name: /create a new case/i });
    expect(helpIcon).toBeInTheDocument();
  });

  it('should show tooltip on help icon hover', async () => {
    const user = userEvent.setup();
    render(<HelpButton helpId="button-create-case">Create Case</HelpButton>);

    const helpIcon = screen.getByRole('button', { name: /create a new case/i });
    await user.hover(helpIcon);

    await waitFor(() => {
      expect(screen.getByText('Create New Case')).toBeInTheDocument();
      expect(screen.getByText('Open wizard to register new case')).toBeInTheDocument();
    });
  });

  it('should not show explanation by default', () => {
    render(<HelpButton helpId="button-create-case">Create Case</HelpButton>);

    expect(screen.queryByText('Start a new case')).not.toBeInTheDocument();
  });

  it('should show explanation when showExplanation is true', () => {
    render(
      <HelpButton helpId="button-create-case" showExplanation={true}>
        Create Case
      </HelpButton>
    );

    expect(screen.getByText('Start a new case')).toBeInTheDocument();
  });

  it('should be keyboard accessible', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <HelpButton helpId="button-create-case" onClick={handleClick}>
        Create Case
      </HelpButton>
    );

    const button = screen.getByRole('button', { name: /create case/i });
    await user.tab();
    expect(button).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should apply custom wrapper className', () => {
    render(
      <HelpButton 
        helpId="button-create-case" 
        wrapperClassName="custom-wrapper"
      >
        Create Case
      </HelpButton>
    );

    const wrapper = screen.getByRole('button', { name: /create case/i }).parentElement;
    expect(wrapper).toHaveClass('custom-wrapper');
  });

  it('should work with disabled state', () => {
    render(
      <HelpButton helpId="button-create-case" disabled>
        Create Case
      </HelpButton>
    );

    const button = screen.getByRole('button', { name: /create case/i });
    expect(button).toBeDisabled();
  });

  it('should render with different button variants', () => {
    const { rerender } = render(
      <HelpButton helpId="button-create-case" variant="default">
        Create Case
      </HelpButton>
    );

    let button = screen.getByRole('button', { name: /create case/i });
    expect(button).toHaveClass('bg-primary');

    rerender(
      <HelpButton helpId="button-create-case" variant="outline">
        Create Case
      </HelpButton>
    );

    button = screen.getByRole('button', { name: /create case/i });
    expect(button).toHaveClass('border-input');
  });

  it('should gracefully degrade when help data not found', () => {
    vi.mocked(uiHelpService.getHelp).mockReturnValue(null);

    render(<HelpButton helpId="non-existent">Button Text</HelpButton>);

    // Button should still render
    expect(screen.getByRole('button', { name: /button text/i })).toBeInTheDocument();
    // But no help icon
    expect(screen.queryByLabelText(/help/i)).not.toBeInTheDocument();
  });
});
