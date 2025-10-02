import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

describe('Modal Standardization Validation Tests', () => {
  describe('DialogHeader Component', () => {
    it('should render with default divider', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const header = screen.getByText('Test Title').closest('div');
      expect(header).toHaveClass('border-b');
    });

    it('should allow disabling divider', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader showDivider={false}>
              <DialogTitle>Test Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const header = screen.getByText('Test Title').closest('div');
      expect(header).not.toHaveClass('border-b');
    });

    it('should have 24px padding (p-6)', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const header = screen.getByText('Test Title').closest('div');
      expect(header).toHaveClass('p-6');
    });
  });

  describe('DialogBody Component', () => {
    it('should be scrollable', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogBody>
              <p>Body content</p>
            </DialogBody>
          </DialogContent>
        </Dialog>
      );

      const body = screen.getByText('Body content').closest('div');
      expect(body).toHaveClass('overflow-y-auto');
    });

    it('should have proper padding', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogBody>
              <p>Body content</p>
            </DialogBody>
          </DialogContent>
        </Dialog>
      );

      const body = screen.getByText('Body content').closest('div');
      expect(body).toHaveClass('px-6');
      expect(body).toHaveClass('py-4');
    });

    it('should flex-grow to fill space', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogBody>
              <p>Body content</p>
            </DialogBody>
          </DialogContent>
        </Dialog>
      );

      const body = screen.getByText('Body content').closest('div');
      expect(body).toHaveClass('flex-1');
    });
  });

  describe('DialogFooter Component', () => {
    it('should render with default divider', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogFooter>
              <Button>Action</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      const footer = screen.getByRole('button', { name: /action/i }).closest('div');
      expect(footer).toHaveClass('border-t');
    });

    it('should allow disabling divider', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogFooter showDivider={false}>
              <Button>Action</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      const footer = screen.getByRole('button', { name: /action/i }).closest('div');
      expect(footer).not.toHaveClass('border-t');
    });

    it('should have 12px button gap (gap-3)', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button>Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      const footer = screen.getByRole('button', { name: /cancel/i }).closest('div');
      expect(footer).toHaveClass('gap-3');
    });

    it('should have 24px padding (p-6)', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogFooter>
              <Button>Action</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      const footer = screen.getByRole('button', { name: /action/i }).closest('div');
      expect(footer).toHaveClass('p-6');
    });

    it('should right-align buttons', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button>Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      const footer = screen.getByRole('button', { name: /cancel/i }).closest('div');
      expect(footer).toHaveClass('sm:justify-end');
    });
  });

  describe('DialogContent Component', () => {
    it('should have max-width constraint', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const content = screen.getByRole('dialog');
      expect(content).toHaveClass('max-w-beacon-modal');
    });

    it('should be responsive on mobile', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const content = screen.getByRole('dialog');
      expect(content).toHaveClass('max-sm:w-[calc(100vw-32px)]');
      expect(content).toHaveClass('max-sm:rounded-beacon-lg');
    });

    it('should have max-height constraint', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const content = screen.getByRole('dialog');
      expect(content).toHaveClass('max-h-[90vh]');
    });

    it('should have flex column layout', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const content = screen.getByRole('dialog');
      expect(content).toHaveClass('flex');
      expect(content).toHaveClass('flex-col');
    });

    it('should render close button with proper aria-label', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveClass('absolute');
      expect(closeButton).toHaveClass('right-4');
      expect(closeButton).toHaveClass('top-4');
    });
  });

  describe('Complete Modal Structure', () => {
    it('should render full modal with all sections', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modal Title</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <p>Modal content goes here</p>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button>Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Modal Title')).toBeInTheDocument();
      expect(screen.getByText('Modal content goes here')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });

    it('should have proper spacing hierarchy', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <div className="space-y-4">
                <input placeholder="Field 1" />
                <input placeholder="Field 2" />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button>Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      // Header padding: 24px (p-6)
      const header = screen.getByText('Title').closest('div');
      expect(header).toHaveClass('p-6');

      // Body padding: 24px horizontal, 16px vertical
      const body = screen.getByPlaceholderText('Field 1').closest('.px-6');
      expect(body).toHaveClass('py-4');

      // Footer padding: 24px (p-6)
      const footer = screen.getByRole('button', { name: /submit/i }).closest('div');
      expect(footer).toHaveClass('p-6');
    });

    it('should have proper dividers between sections', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader showDivider={true}>
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <p>Content</p>
            </DialogBody>
            <DialogFooter showDivider={true}>
              <Button>Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      const header = screen.getByText('Title').closest('div');
      expect(header).toHaveClass('border-b');

      const footer = screen.getByRole('button', { name: /submit/i }).closest('div');
      expect(footer).toHaveClass('border-t');
    });
  });

  describe('Semantic Color Tokens', () => {
    it('should use semantic color for title', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const title = screen.getByText('Title');
      expect(title).toHaveClass('text-foreground');
    });

    it('should use semantic border colors', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader showDivider={true}>
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
            <DialogFooter showDivider={true}>
              <Button>Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      const header = screen.getByText('Title').closest('div');
      expect(header).toHaveClass('border-border');

      const footer = screen.getByRole('button', { name: /submit/i }).closest('div');
      expect(footer).toHaveClass('border-border');
    });

    it('should use semantic background color', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('bg-background');
    });
  });

  describe('Accessibility Standards', () => {
    it('should have proper dialog role', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('role', 'dialog');
    });

    it('should have aria-modal attribute', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should link title with aria-labelledby', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Modal</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const dialog = screen.getByRole('dialog');
      const title = screen.getByText('Test Modal');
      
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(title.id).toBeTruthy();
    });

    it('should have visible focus indicators', () => {
      render(
        <Dialog open={true}>
          <DialogContent>
            <DialogFooter>
              <Button>Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      const button = screen.getByRole('button', { name: /submit/i });
      expect(button).toHaveClass('focus-visible:ring-2');
    });
  });
});
