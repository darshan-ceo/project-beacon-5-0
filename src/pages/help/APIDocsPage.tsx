import React, { useState, useEffect } from 'react';
import { ArrowLeft, Copy, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const APIDocsPage: React.FC = () => {
  const navigate = useNavigate();
  const [copiedCode, setCopiedCode] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  console.log('[help-fix] Loading API Documentation page');

  useEffect(() => {
    const loadAPIContent = async () => {
      try {
        // Try to load from content/help/api.mdx
        const response = await fetch('/content/help/api.mdx');
        if (response.ok) {
          const mdxContent = await response.text();
          setContent(mdxContent);
        } else {
          // Use fallback content
          setContent(getFallbackAPIContent());
        }
        console.log('[help-fix] Loaded API documentation content');
      } catch (error) {
        console.error('[help-fix] Failed to load API content:', error);
        setContent(getFallbackAPIContent());
      } finally {
        setLoading(false);
      }
    };

    loadAPIContent();
  }, []);

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const getFallbackAPIContent = () => `
# API Documentation

## Overview

The Legal Case Management System provides RESTful APIs for integration with external systems and custom applications.

## Authentication

All API requests require authentication using JWT tokens.

\`\`\`bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
     -H "Content-Type: application/json" \\
     https://api.example.com/v1/cases
\`\`\`

## Base URL

Production: \`https://api.legalsystem.com/v1\`
Staging: \`https://staging-api.legalsystem.com/v1\`

## Rate Limiting

- 1000 requests per hour per API key
- 429 status code returned when limit exceeded

## Cases API

### List Cases

\`\`\`http
GET /v1/cases
\`\`\`

**Parameters:**
- \`limit\` (optional): Number of results (default: 50, max: 100)
- \`offset\` (optional): Pagination offset (default: 0)
- \`status\` (optional): Filter by case status

**Response:**
\`\`\`json
{
  "data": [
    {
      "id": "case-123",
      "title": "Sample Case",
      "status": "active",
      "clientId": "client-456",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0
  }
}
\`\`\`

### Create Case

\`\`\`http
POST /v1/cases
\`\`\`

**Request Body:**
\`\`\`json
{
  "title": "New Case Title",
  "clientId": "client-456",
  "caseType": "litigation",
  "priority": "high",
  "description": "Case description"
}
\`\`\`

## Documents API

### Upload Document

\`\`\`http
POST /v1/documents
Content-Type: multipart/form-data
\`\`\`

### Get Document

\`\`\`http
GET /v1/documents/{documentId}
\`\`\`

## Error Handling

All errors return JSON with error details:

\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": [
      {
        "field": "clientId",
        "message": "Client ID is required"
      }
    ]
  }
}
\`\`\`

## Status Codes

- \`200\` - Success
- \`201\` - Created
- \`400\` - Bad Request
- \`401\` - Unauthorized
- \`403\` - Forbidden
- \`404\` - Not Found
- \`429\` - Rate Limited
- \`500\` - Internal Server Error
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
        <h1 className="text-3xl font-bold tracking-tight">API Documentation</h1>
        <p className="text-muted-foreground mt-2">
          RESTful API reference for system integration
        </p>
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
              code: ({ children, className }) => {
                const isCodeBlock = className?.includes('language-');
                if (isCodeBlock) {
                  const codeString = String(children).replace(/\n$/, '');
                  const language = className?.replace('language-', '') || '';
                  const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;
                  
                  return (
                    <div className="relative">
                      <div className="flex items-center justify-between bg-muted/50 px-4 py-2 border-b">
                        <Badge variant="secondary" className="text-xs">
                          {language}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(codeString, codeId)}
                          className="h-6 px-2"
                        >
                          {copiedCode === codeId ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <pre className="bg-muted p-4 rounded-none rounded-b-lg overflow-x-auto">
                        <code className="text-sm">{children}</code>
                      </pre>
                    </div>
                  );
                }
                return <code className="bg-muted px-2 py-1 rounded text-sm">{children}</code>;
              }
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};