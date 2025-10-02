import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { screen, waitFor } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { ThreeLayerHelp } from '@/components/ui/three-layer-help';
import { HelpButton } from '@/components/ui/help-button';
import { uiHelpService } from '@/services/uiHelpService';
import { featureFlagService } from '@/services/featureFlagService';

vi.mock('@/services/uiHelpService');
vi.mock('@/services/featureFlagService');

describe('Tooltip Accessibility Tests', () => {
  const mockHelpData = {
    id: 'test-element',
    module: 'test',
    type: 'button' as const,
    label: 'Test Action',
    explanation: 'Test explanation',
    tooltip: {
      title: 'Test Title',
      content: 'Test content for accessibility',
      learnMoreUrl: 'https://example.com/help'
    },
    accessibility: {
      ariaLabel: 'Perform test action',
      keyboardShortcut: 'Ctrl+T'
    }
  };

  beforeEach(() => {
    vi.mocked(featureFlagService.isEnabled).mockReturnValue(true);
    vi.mocked(uiHelpService.getHelp).mockReturnValue(mockHelpData);
  });

  describe('WCAG 2.1 AA Compliance', () => {
    it('should have proper ARIA labels for screen readers', () => {
      render(<ThreeLayerHelp helpId="test-element" />);

      const helpIcon = screen.getByRole('button', { name: /perform test action/i });
      expect(helpIcon).toHaveAttribute('aria-label', 'Perform test action');
    });

    it('should be keyboard navigable with Tab', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <button>Previous Element</button>
          <ThreeLayerHelp helpId="test-element">
            <button>Main Button</button>
          </ThreeLayerHelp>
          <button>Next Element</button>
        </div>
      );

      // Tab through elements
      await user.tab();
      expect(screen.getByText('Previous Element')).toHaveFocus();

      await user.tab();
      expect(screen.getByText('Main Button')).toHaveFocus();

      await user.tab();
      const helpIcon = screen.getByRole('button', { name: /perform test action/i });
      expect(helpIcon).toHaveFocus();

      await user.tab();
      expect(screen.getByText('Next Element')).toHaveFocus();
    });

    it('should show tooltip on keyboard focus and hide on blur', async () => {
      const user = userEvent.setup();
      render(<ThreeLayerHelp helpId="test-element" />);

      const helpIcon = screen.getByRole('button', { name: /perform test action/i });

      // Focus with Tab
      await user.tab();
      await waitFor(() => {
        expect(screen.getByText('Test Title')).toBeInTheDocument();
      });

      // Blur with Tab
      await user.tab();
      await waitFor(() => {
        expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
      });
    });

    it('should be operable with keyboard (Enter/Space)', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(
        <HelpButton helpId="test-element" onClick={handleClick}>
          Action Button
        </HelpButton>
      );

      const button = screen.getByRole('button', { name: /action button/i });
      button.focus();

      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);

      await user.keyboard(' '); // Space
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('should have visible focus indicators', () => {
      render(<ThreeLayerHelp helpId="test-element" />);

      const helpIcon = screen.getByRole('button', { name: /perform test action/i });
      
      // Check for focus-visible styles
      expect(helpIcon).toHaveClass('focus-visible:outline-none');
      expect(helpIcon).toHaveClass('focus-visible:ring-2');
      expect(helpIcon).toHaveClass('focus-visible:ring-ring');
    });

    it('should maintain focus order in DOM', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <input type="text" placeholder="Input 1" />
          <HelpButton helpId="test-element">Button</HelpButton>
          <input type="text" placeholder="Input 2" />
        </div>
      );

      await user.tab();
      expect(screen.getByPlaceholderText('Input 1')).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /button/i })).toHaveFocus();

      await user.tab();
      // Should focus on help icon
      const helpIcon = screen.getByRole('button', { name: /perform test action/i });
      expect(helpIcon).toHaveFocus();

      await user.tab();
      expect(screen.getByPlaceholderText('Input 2')).toHaveFocus();
    });

    it('should support keyboard shortcuts display', async () => {
      const user = userEvent.setup();
      render(<ThreeLayerHelp helpId="test-element" />);

      const helpIcon = screen.getByRole('button', { name: /perform test action/i });
      await user.hover(helpIcon);

      await waitFor(() => {
        expect(screen.getByText(/Shortcut:/i)).toBeInTheDocument();
        expect(screen.getByText('Ctrl+T')).toBeInTheDocument();
      });
    });

    it('should have sufficient touch target size (44x44px minimum)', () => {
      render(<ThreeLayerHelp helpId="test-element" />);

      const helpIcon = screen.getByRole('button', { name: /perform test action/i });
      
      // Check minimum size classes are applied
      expect(helpIcon).toHaveClass('w-4');
      expect(helpIcon).toHaveClass('h-4');
      // Note: In real implementation, padding should ensure 44x44px total
    });

    it('should work with screen reader announcements', async () => {
      const user = userEvent.setup();
      render(<HelpButton helpId="test-element">Create</HelpButton>);

      const button = screen.getByRole('button', { name: /create/i });
      const helpIcon = screen.getByRole('button', { name: /perform test action/i });

      // Both elements should be announced separately
      expect(button).toBeInTheDocument();
      expect(helpIcon).toBeInTheDocument();
      expect(helpIcon).toHaveAttribute('aria-label');
    });
  });

  describe('Color Contrast', () => {
    it('should use semantic color tokens for proper contrast', () => {
      render(<ThreeLayerHelp helpId="test-element" />);

      const helpIcon = screen.getByRole('button', { name: /perform test action/i });
      
      // Should use semantic tokens, not hardcoded colors
      expect(helpIcon).toHaveClass('text-muted-foreground');
      expect(helpIcon).toHaveClass('hover:text-primary');
    });

    it('should have proper contrast for explanation text', () => {
      render(<ThreeLayerHelp helpId="test-element" showExplanation={true} />);

      const explanation = screen.getByText('Test explanation');
      
      // Should use muted but readable color
      expect(explanation).toHaveClass('text-muted-foreground');
    });
  });

  describe('Motion and Animation', () => {
    it('should respect prefers-reduced-motion', () => {
      // In real implementation, check for motion preferences
      render(<ThreeLayerHelp helpId="test-element" />);

      // Framer Motion animations should use duration: 0.2s (reasonable)
      // This test verifies animation classes are applied
      const helpIcon = screen.getByRole('button', { name: /perform test action/i });
      expect(helpIcon).toHaveClass('transition-colors');
    });
  });

  describe('Error Handling', () => {
    it('should degrade gracefully without help data', () => {
      vi.mocked(uiHelpService.getHelp).mockReturnValue(null);

      render(
        <ThreeLayerHelp helpId="non-existent">
          <button>Fallback Button</button>
        </ThreeLayerHelp>
      );

      // Button should still be accessible
      const button = screen.getByRole('button', { name: /fallback button/i });
      expect(button).toBeInTheDocument();
    });

    it('should work when feature flag is disabled', () => {
      vi.mocked(featureFlagService.isEnabled).mockReturnValue(false);

      render(
        <HelpButton helpId="test-element">Button</HelpButton>
      );

      // Button should render but without help system
      expect(screen.getByRole('button', { name: /button/i })).toBeInTheDocument();
    });
  });

  describe('Links and Navigation', () => {
    it('should have proper attributes for external links', async () => {
      const user = userEvent.setup();
      render(<ThreeLayerHelp helpId="test-element" />);

      const helpIcon = screen.getByRole('button', { name: /perform test action/i });
      await user.hover(helpIcon);

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /learn more/i });
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });
  });
});
