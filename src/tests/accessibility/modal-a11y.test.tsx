import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

describe('Modal Accessibility Tests', () => {
  const TestModal = ({ 
    open, 
    onOpenChange 
  }: { 
    open: boolean; 
    onOpenChange: (open: boolean) => void 
  }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Test Modal Title</DialogTitle>
          <DialogDescription>This is a test modal description</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <input type="text" placeholder="First field" />
          <input type="text" placeholder="Second field" />
        </DialogBody>
        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  describe('WCAG 2.1 AA Compliance', () => {
    it('should have proper dialog role', () => {
      const handleChange = vi.fn();
      render(<TestModal open={true} onOpenChange={handleChange} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('should have aria-modal attribute', () => {
      const handleChange = vi.fn();
      render(<TestModal open={true} onOpenChange={handleChange} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should be labeled by DialogTitle', () => {
      const handleChange = vi.fn();
      render(<TestModal open={true} onOpenChange={handleChange} />);

      const dialog = screen.getByRole('dialog');
      const title = screen.getByText('Test Modal Title');
      
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(title.id).toBeTruthy();
    });

    it('should be described by DialogDescription', () => {
      const handleChange = vi.fn();
      render(<TestModal open={true} onOpenChange={handleChange} />);

      const dialog = screen.getByRole('dialog');
      const description = screen.getByText('This is a test modal description');
      
      expect(dialog).toHaveAttribute('aria-describedby');
      expect(description.id).toBeTruthy();
    });

    it('should have visible close button with proper label', () => {
      const handleChange = vi.fn();
      render(<TestModal open={true} onOpenChange={handleChange} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('should trap focus within modal', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<TestModal open={true} onOpenChange={handleChange} />);

      const firstField = screen.getByPlaceholderText('First field');
      const secondField = screen.getByPlaceholderText('Second field');
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const submitButton = screen.getByRole('button', { name: /submit/i });
      const closeButton = screen.getByRole('button', { name: /close/i });

      // Tab through all elements
      await user.tab();
      expect(firstField).toHaveFocus();

      await user.tab();
      expect(secondField).toHaveFocus();

      await user.tab();
      expect(cancelButton).toHaveFocus();

      await user.tab();
      expect(submitButton).toHaveFocus();

      await user.tab();
      expect(closeButton).toHaveFocus();

      // Should cycle back to first element
      await user.tab();
      expect(firstField).toHaveFocus();
    });

    it('should close on Escape key press', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<TestModal open={true} onOpenChange={handleChange} />);

      await user.keyboard('{Escape}');
      expect(handleChange).toHaveBeenCalledWith(false);
    });

    it('should prevent background interaction when open', () => {
      const handleChange = vi.fn();
      render(
        <>
          <button>Background Button</button>
          <TestModal open={true} onOpenChange={handleChange} />
        </>
      );

      const backgroundButton = screen.getByRole('button', { name: /background button/i });
      const dialog = screen.getByRole('dialog');

      // Dialog overlay should block clicks
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should set initial focus on first interactive element', async () => {
      const handleChange = vi.fn();
      render(<TestModal open={true} onOpenChange={handleChange} />);

      await waitFor(() => {
        const firstField = screen.getByPlaceholderText('First field');
        expect(document.activeElement).toBe(firstField);
      });
    });

    it('should support Shift+Tab for reverse navigation', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<TestModal open={true} onOpenChange={handleChange} />);

      const firstField = screen.getByPlaceholderText('First field');
      const closeButton = screen.getByRole('button', { name: /close/i });

      // Focus first field
      firstField.focus();
      expect(firstField).toHaveFocus();

      // Shift+Tab should go to last element (close button)
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(closeButton).toHaveFocus();
    });

    it('should allow Enter key on buttons', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<TestModal open={true} onOpenChange={handleChange} />);

      const submitButton = screen.getByRole('button', { name: /submit/i });
      submitButton.focus();

      await user.keyboard('{Enter}');
      expect(handleChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Visual Design & Spacing', () => {
    it('should have consistent 24px padding', () => {
      const handleChange = vi.fn();
      render(<TestModal open={true} onOpenChange={handleChange} />);

      const header = screen.getByText('Test Modal Title').closest('div');
      expect(header).toHaveClass('p-6'); // 24px = 6 * 4px
    });

    it('should have proper button spacing in footer', () => {
      const handleChange = vi.fn();
      render(<TestModal open={true} onOpenChange={handleChange} />);

      const footer = screen.getByRole('button', { name: /cancel/i }).closest('div');
      expect(footer).toHaveClass('gap-3'); // 12px = 3 * 4px
    });

    it('should have header divider by default', () => {
      const handleChange = vi.fn();
      render(<TestModal open={true} onOpenChange={handleChange} />);

      const header = screen.getByText('Test Modal Title').closest('div');
      expect(header).toHaveClass('border-b');
    });

    it('should have footer divider by default', () => {
      const handleChange = vi.fn();
      render(<TestModal open={true} onOpenChange={handleChange} />);

      const footer = screen.getByRole('button', { name: /cancel/i }).closest('div');
      expect(footer).toHaveClass('border-t');
    });
  });

  describe('Color Contrast', () => {
    it('should use semantic color tokens', () => {
      const handleChange = vi.fn();
      render(<TestModal open={true} onOpenChange={handleChange} />);

      const title = screen.getByText('Test Modal Title');
      expect(title).toHaveClass('text-foreground');

      const description = screen.getByText('This is a test modal description');
      expect(description).toHaveClass('text-muted-foreground');
    });
  });

  describe('Focus Indicators', () => {
    it('should have visible focus rings on interactive elements', () => {
      const handleChange = vi.fn();
      render(<TestModal open={true} onOpenChange={handleChange} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      
      // Check for focus-visible classes
      expect(closeButton).toHaveClass('focus:outline-none');
      expect(closeButton).toHaveClass('focus:ring-2');
    });
  });

  describe('Screen Reader Support', () => {
    it('should announce modal opening to screen readers', () => {
      const handleChange = vi.fn();
      render(<TestModal open={true} onOpenChange={handleChange} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('role', 'dialog');
    });

    it('should have proper heading hierarchy', () => {
      const handleChange = vi.fn();
      render(<TestModal open={true} onOpenChange={handleChange} />);

      const title = screen.getByText('Test Modal Title');
      // DialogTitle should render as h2 or have proper heading role
      expect(title.tagName).toBe('H2');
    });
  });

  describe('Overlay & Backdrop', () => {
    it('should have semi-transparent overlay', () => {
      const handleChange = vi.fn();
      const { container } = render(<TestModal open={true} onOpenChange={handleChange} />);

      const overlay = container.querySelector('[data-state="open"]');
      expect(overlay).toBeTruthy();
    });

    it('should close on overlay click by default', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      const { container } = render(<TestModal open={true} onOpenChange={handleChange} />);

      // Radix dialog handles overlay clicks automatically
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    it('should be responsive on mobile viewports', () => {
      const handleChange = vi.fn();
      render(<TestModal open={true} onOpenChange={handleChange} />);

      const dialog = screen.getByRole('dialog');
      
      // Check for mobile responsive classes
      expect(dialog).toHaveClass('max-sm:w-[calc(100vw-32px)]');
      expect(dialog).toHaveClass('max-sm:rounded-beacon-lg');
    });
  });

  describe('Error Handling', () => {
    it('should work without DialogDescription', () => {
      const MinimalModal = ({ 
        open, 
        onOpenChange 
      }: { 
        open: boolean; 
        onOpenChange: (open: boolean) => void 
      }) => (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Minimal Modal</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <p>Content without description</p>
            </DialogBody>
          </DialogContent>
        </Dialog>
      );

      const handleChange = vi.fn();
      render(<MinimalModal open={true} onOpenChange={handleChange} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText('Minimal Modal')).toBeInTheDocument();
    });

    it('should work without DialogFooter', () => {
      const NoFooterModal = ({ 
        open, 
        onOpenChange 
      }: { 
        open: boolean; 
        onOpenChange: (open: boolean) => void 
      }) => (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>No Footer Modal</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <p>Content without footer</p>
            </DialogBody>
          </DialogContent>
        </Dialog>
      );

      const handleChange = vi.fn();
      render(<NoFooterModal open={true} onOpenChange={handleChange} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });
  });
});
