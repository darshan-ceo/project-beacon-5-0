import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { screen, waitFor } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { ThreeLayerHelp } from '@/components/ui/three-layer-help';
import { uiHelpService } from '@/services/uiHelpService';
import { featureFlagService } from '@/services/featureFlagService';

vi.mock('@/services/uiHelpService');
vi.mock('@/services/featureFlagService');

describe('ThreeLayerHelp', () => {
  const mockHelpData = {
    id: 'test-button',
    module: 'test',
    type: 'button' as const,
    label: 'Test Button',
    explanation: 'This is a test explanation',
    tooltip: {
      title: 'Test Tooltip Title',
      content: 'This is detailed tooltip content',
      learnMoreUrl: 'https://example.com/help'
    },
    accessibility: {
      ariaLabel: 'Test button action',
      keyboardShortcut: 'Ctrl+T'
    }
  };

  beforeEach(() => {
    vi.mocked(featureFlagService.isEnabled).mockReturnValue(true);
    vi.mocked(uiHelpService.getHelp).mockReturnValue(mockHelpData);
  });

  it('should render label from help data', () => {
    render(<ThreeLayerHelp helpId="test-button" />);

    expect(screen.getByText('Test Button')).toBeInTheDocument();
  });

  it('should render custom children instead of label', () => {
    render(
      <ThreeLayerHelp helpId="test-button">
        <button>Custom Button</button>
      </ThreeLayerHelp>
    );

    expect(screen.getByText('Custom Button')).toBeInTheDocument();
    expect(screen.queryByText('Test Button')).not.toBeInTheDocument();
  });

  it('should render explanation when showExplanation is true', () => {
    render(<ThreeLayerHelp helpId="test-button" showExplanation={true} />);

    expect(screen.getByText('This is a test explanation')).toBeInTheDocument();
  });

  it('should not render explanation when showExplanation is false', () => {
    render(<ThreeLayerHelp helpId="test-button" showExplanation={false} />);

    expect(screen.queryByText('This is a test explanation')).not.toBeInTheDocument();
  });

  it('should show tooltip on click', async () => {
    const user = userEvent.setup();
    render(<ThreeLayerHelp helpId="test-button" />);

    const helpIcon = screen.getByRole('button', { name: /test button action/i });
    await user.click(helpIcon);

    await waitFor(() => {
      expect(screen.getByText('Test Tooltip Title')).toBeInTheDocument();
      expect(screen.getByText('This is detailed tooltip content')).toBeInTheDocument();
    });
  });

  it('should show tooltip on keyboard activation', async () => {
    const user = userEvent.setup();
    render(<ThreeLayerHelp helpId="test-button" />);

    const helpIcon = screen.getByRole('button', { name: /test button action/i });
    helpIcon.focus();
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText('Test Tooltip Title')).toBeInTheDocument();
    });
  });

  it('should hide tooltip on outside click', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button>Outside</button>
        <ThreeLayerHelp helpId="test-button" />
      </div>
    );

    const helpIcon = screen.getByRole('button', { name: /test button action/i });
    await user.click(helpIcon);

    await waitFor(() => {
      expect(screen.getByText('Test Tooltip Title')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Outside'));

    await waitFor(() => {
      expect(screen.queryByText('Test Tooltip Title')).not.toBeInTheDocument();
    });
  });

  it('should render learn more link when provided', async () => {
    const user = userEvent.setup();
    render(<ThreeLayerHelp helpId="test-button" />);

    const helpIcon = screen.getByRole('button', { name: /test button action/i });
    await user.click(helpIcon);

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /learn more/i });
      expect(link).toHaveAttribute('href', 'https://example.com/help');
      expect(link).toHaveAttribute('target', '_blank');
    });
  });

  it('should display keyboard shortcut when provided', async () => {
    const user = userEvent.setup();
    render(<ThreeLayerHelp helpId="test-button" />);

    const helpIcon = screen.getByRole('button', { name: /test button action/i });
    await user.click(helpIcon);

    await waitFor(() => {
      expect(screen.getByText(/Shortcut:/i)).toBeInTheDocument();
      expect(screen.getByText('Ctrl+T')).toBeInTheDocument();
    });
  });

  it('should not render when feature flag is disabled', () => {
    vi.mocked(featureFlagService.isEnabled).mockReturnValue(false);

    render(
      <ThreeLayerHelp helpId="test-button">
        <span>Content</span>
      </ThreeLayerHelp>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should gracefully degrade when help data not found', () => {
    vi.mocked(uiHelpService.getHelp).mockReturnValue(null);

    render(
      <ThreeLayerHelp helpId="non-existent">
        <span>Fallback Content</span>
      </ThreeLayerHelp>
    );

    expect(screen.getByText('Fallback Content')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    render(<ThreeLayerHelp helpId="test-button" />);

    const helpIcon = screen.getByRole('button', { name: /test button action/i });
    expect(helpIcon).toHaveAttribute('aria-label', 'Test button action');
    expect(helpIcon).toHaveAttribute('type', 'button');
  });

  it('should be keyboard navigable', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button>Before</button>
        <ThreeLayerHelp helpId="test-button" />
        <button>After</button>
      </div>
    );

    await user.tab(); // Focus "Before"
    expect(screen.getByText('Before')).toHaveFocus();

    await user.tab(); // Focus help icon
    const helpIcon = screen.getByRole('button', { name: /test button action/i });
    expect(helpIcon).toHaveFocus();

    await user.tab(); // Focus "After"
    expect(screen.getByText('After')).toHaveFocus();
  });
});
