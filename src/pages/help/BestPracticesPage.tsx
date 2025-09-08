import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Users, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const BestPracticesPage: React.FC = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  console.log('[help-fix] Loading Best Practices page');

  useEffect(() => {
    const loadBestPracticesContent = async () => {
      try {
        // Try to load from content/help/best-practices.mdx
        const response = await fetch('/content/help/best-practices.mdx');
        if (response.ok) {
          const mdxContent = await response.text();
          setContent(mdxContent);
        } else {
          // Use fallback content
          setContent(getFallbackBestPracticesContent());
        }
        console.log('[help-fix] Loaded best practices content');
      } catch (error) {
        console.error('[help-fix] Failed to load best practices content:', error);
        setContent(getFallbackBestPracticesContent());
      } finally {
        setLoading(false);
      }
    };

    loadBestPracticesContent();
  }, []);

  const getFallbackBestPracticesContent = () => `
# Best Practices Guide

## Case Management Excellence

### Case Setup and Organization

**Standard Case Structure:**
- Establish consistent case numbering systems
- Create standardized folder hierarchies
- Implement clear naming conventions
- Set up automated workflows

**Timeline Management:**
- Define key milestones early
- Set realistic deadlines
- Build in buffer time for unexpected delays
- Regular progress reviews

### Client Communication

**Communication Standards:**
- Respond to client inquiries within 24 hours
- Provide regular case updates
- Document all client interactions
- Use clear, non-legal language when appropriate

**Documentation Best Practices:**
- Date and time stamp all communications
- Include relevant case references
- Maintain confidentiality protocols
- Store communications in centralized system

## Document Management Excellence

### Organization Strategies

**Folder Structure Standards:**
\`\`\`
Case_Name_[Case_Number]/
├── 01_Pleadings/
│   ├── Initial_Pleadings/
│   ├── Motions/
│   └── Orders/
├── 02_Discovery/
│   ├── Requests/
│   ├── Responses/
│   └── Depositions/
├── 03_Evidence/
│   ├── Physical_Evidence/
│   ├── Digital_Evidence/
│   └── Expert_Reports/
├── 04_Correspondence/
├── 05_Research/
└── 06_Administrative/
\`\`\`

**Version Control:**
- Use clear version numbering (v1, v2, final)
- Include revision dates in filenames
- Maintain audit trails
- Archive outdated versions

### Security and Compliance

**Access Control:**
- Implement role-based access
- Regular access reviews
- Document access logs
- Secure client portal usage

**Data Protection:**
- Encrypt sensitive documents
- Regular backups
- Secure deletion procedures
- Compliance with data retention policies

## Workflow Optimization

### Task Management

**Priority Systems:**
- High: Court deadlines, client emergencies
- Medium: Discovery deadlines, routine correspondence
- Low: Administrative tasks, internal projects

**Assignment Best Practices:**
- Clear task descriptions
- Defined deliverables
- Realistic timelines
- Regular check-ins

### Technology Utilization

**System Integration:**
- Calendar synchronization
- Document automation
- Template utilization
- Reporting automation

**AI Assistant Usage:**
- Document review assistance
- Research support
- Template generation
- Quality checks

## Quality Assurance

### Review Processes

**Multi-Stage Review:**
1. Self-review by author
2. Peer review by colleague
3. Senior review for complex matters
4. Final quality check before submission

**Quality Metrics:**
- Document accuracy rates
- Timeline adherence
- Client satisfaction scores
- Error reduction metrics

### Continuous Improvement

**Regular Assessments:**
- Monthly workflow reviews
- Quarterly process audits
- Annual system evaluations
- Client feedback integration

**Training and Development:**
- Regular system training sessions
- Best practice sharing meetings
- External legal education
- Technology update training
`;

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="h-32 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/help')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Help Center
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Best Practices</h1>
        <p className="text-muted-foreground mt-2">
          Expert guidance for optimal system usage and legal practice management
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="text-center pb-4">
            <BookOpen className="h-8 w-8 mx-auto text-primary" />
            <CardTitle className="text-base">Case Management</CardTitle>
            <CardDescription className="text-sm">Organize and track cases effectively</CardDescription>
          </CardHeader>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="text-center pb-4">
            <Users className="h-8 w-8 mx-auto text-primary" />
            <CardTitle className="text-base">Client Relations</CardTitle>
            <CardDescription className="text-sm">Build strong client relationships</CardDescription>
          </CardHeader>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="text-center pb-4">
            <Shield className="h-8 w-8 mx-auto text-primary" />
            <CardTitle className="text-base">Security & Compliance</CardTitle>
            <CardDescription className="text-sm">Maintain data security and legal compliance</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Separator />

      {/* Content */}
      <div className="max-w-4xl">
        <div className="prose prose-slate max-w-none dark:prose-invert">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-8">{children}</h1>,
              h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 mt-6">{children}</h2>,
              h3: ({ children }) => <h3 className="text-lg font-medium mb-2 mt-4">{children}</h3>,
              p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              code: ({ children }) => <code className="bg-muted px-2 py-1 rounded text-sm">{children}</code>,
              pre: ({ children }) => <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};