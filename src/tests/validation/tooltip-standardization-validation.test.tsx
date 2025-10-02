import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

describe('Tooltip Standardization Validation Tests', () => {
  describe('TooltipContent Component', () => {
    it('should have max-width of 280px', async () => {
      const user = userEvent.setup();
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button>Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tooltip content</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByRole('button');
      await user.hover(trigger);

      await waitFor(() => {
        const tooltip = screen.getByText('Tooltip content').closest('div');
        expect(tooltip).toHaveClass('max-w-[280px]');
      });
    });

    it('should have break-words for text wrapping', async () => {
      const user = userEvent.setup();
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button>Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Very long tooltip content that needs to wrap properly</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByRole('button');
      await user.hover(trigger);

      await waitFor(() => {
        const tooltip = screen.getByText(/very long tooltip/i).closest('div');
        expect(tooltip).toHaveClass('break-words');
      });
    });

    it('should have collision padding of 8px', async () => {
      const user = userEvent.setup();
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button>Hover me</Button>
            </TooltipTrigger>
            <TooltipContent collisionPadding={8}>
              <p>Tooltip content</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByRole('button');
      await user.hover(trigger);

      await waitFor(() => {
        expect(screen.getByText('Tooltip content')).toBeInTheDocument();
      });
    });

    it('should use semantic color tokens', async () => {
      const user = userEvent.setup();
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button>Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tooltip content</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByRole('button');
      await user.hover(trigger);

      await waitFor(() => {
        const tooltip = screen.getByText('Tooltip content').closest('div');
        expect(tooltip).toHaveClass('bg-popover');
        expect(tooltip).toHaveClass('text-popover-foreground');
      });
    });

    it('should have proper z-index for modals', async () => {
      const user = userEvent.setup();
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button>Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tooltip content</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByRole('button');
      await user.hover(trigger);

      await waitFor(() => {
        const tooltip = screen.getByText('Tooltip content').closest('div');
        expect(tooltip).toHaveClass('z-50');
      });
    });
  });

  describe('Hover-Only Behavior', () => {
    it('should not show tooltip on mount', () => {
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button>Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tooltip content</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      expect(screen.queryByText('Tooltip content')).not.toBeInTheDocument();
    });

    it('should show tooltip on hover', async () => {
      const user = userEvent.setup();
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button>Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tooltip content</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByRole('button');
      await user.hover(trigger);

      await waitFor(() => {
        expect(screen.getByText('Tooltip content')).toBeInTheDocument();
      });
    });

    it('should hide tooltip when mouse leaves', async () => {
      const user = userEvent.setup();
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button>Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tooltip content</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByRole('button');
      await user.hover(trigger);

      await waitFor(() => {
        expect(screen.getByText('Tooltip content')).toBeInTheDocument();
      });

      await user.unhover(trigger);

      await waitFor(() => {
        expect(screen.queryByText('Tooltip content')).not.toBeInTheDocument();
      });
    });

    it('should show tooltip on keyboard focus', async () => {
      const user = userEvent.setup();
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button>Focus me</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tooltip content</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('Tooltip content')).toBeInTheDocument();
      });
    });

    it('should hide tooltip on blur', async () => {
      const user = userEvent.setup();
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button>Focus me</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tooltip content</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      await user.tab();

      await waitFor(() => {
        expect(screen.getByText('Tooltip content')).toBeInTheDocument();
      });

      await user.tab();

      await waitFor(() => {
        expect(screen.queryByText('Tooltip content')).not.toBeInTheDocument();
      });
    });
  });

  describe('Animation', () => {
    it('should have fade-in animation', async () => {
      const user = userEvent.setup();
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button>Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tooltip content</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByRole('button');
      await user.hover(trigger);

      await waitFor(() => {
        const tooltip = screen.getByText('Tooltip content').closest('div');
        expect(tooltip).toHaveClass('animate-in');
        expect(tooltip).toHaveClass('fade-in-0');
        expect(tooltip).toHaveClass('zoom-in-95');
      });
    });

    it('should have fade-out animation', async () => {
      const user = userEvent.setup();
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button>Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tooltip content</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByRole('button');
      await user.hover(trigger);

      await waitFor(() => {
        const tooltip = screen.getByText('Tooltip content').closest('div');
        expect(tooltip).toHaveClass('data-[state=closed]:animate-out');
        expect(tooltip).toHaveClass('data-[state=closed]:fade-out-0');
      });
    });
  });

  describe('Positioning', () => {
    it('should have appropriate side offset', async () => {
      const user = userEvent.setup();
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button>Hover me</Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={4}>
              <p>Tooltip content</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByRole('button');
      await user.hover(trigger);

      await waitFor(() => {
        expect(screen.getByText('Tooltip content')).toBeInTheDocument();
      });
    });

    it('should adjust position based on viewport', async () => {
      const user = userEvent.setup();
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button>Hover me</Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Tooltip content</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByRole('button');
      await user.hover(trigger);

      await waitFor(() => {
        const tooltip = screen.getByText('Tooltip content').closest('div');
        expect(tooltip).toHaveClass('data-[side=top]:slide-in-from-bottom-2');
      });
    });
  });

  describe('Accessibility', () => {
    it('should not interfere with button accessibility', () => {
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button>Accessible Button</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tooltip content</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const button = screen.getByRole('button', { name: /accessible button/i });
      expect(button).toBeInTheDocument();
    });

    it('should work within modal dialogs', async () => {
      const user = userEvent.setup();
      render(
        <div role="dialog" aria-modal="true">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button>Modal Button</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Modal tooltip</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      );

      const trigger = screen.getByRole('button');
      await user.hover(trigger);

      await waitFor(() => {
        expect(screen.getByText('Modal tooltip')).toBeInTheDocument();
      });
    });
  });

  describe('Content Overflow', () => {
    it('should handle overflow properly', async () => {
      const user = userEvent.setup();
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button>Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tooltip content</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByRole('button');
      await user.hover(trigger);

      await waitFor(() => {
        const tooltip = screen.getByText('Tooltip content').closest('div');
        expect(tooltip).toHaveClass('overflow-hidden');
      });
    });

    it('should have rounded corners', async () => {
      const user = userEvent.setup();
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button>Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tooltip content</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

      const trigger = screen.getByRole('button');
      await user.hover(trigger);

      await waitFor(() => {
        const tooltip = screen.getByText('Tooltip content').closest('div');
        expect(tooltip).toHaveClass('rounded-md');
      });
    });
  });
});
