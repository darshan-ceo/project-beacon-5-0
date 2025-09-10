import React from 'react';
import { withGlossary } from '@/components/help/GlossaryTooltip';

// Enhanced components with automatic glossary integration
export const GlossaryText = withGlossary(({ children, className = "", ...props }) => (
  <span className={className} {...props}>{children}</span>
));

export const GlossaryCard = withGlossary(({ children, className = "", ...props }) => (
  <div className={className} {...props}>{children}</div>
));

export const GlossaryDescription = withGlossary(({ children, className = "", ...props }) => (
  <p className={className} {...props}>{children}</p>
));