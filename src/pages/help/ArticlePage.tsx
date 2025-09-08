import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, User, Tag, ArrowRight } from 'lucide-react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface HelpContent {
  id: string;
  title: string;
  description: string;
  category: string;
  slug: string;
  roles: string[];
  content: string;
  tags: string[];
  lastUpdated: string;
}

export const ArticlePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [article, setArticle] = useState<HelpContent | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<HelpContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  console.log('[help-fix] Loading article page for slug:', slug);

  useEffect(() => {
    const loadArticle = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        // Load all help content
        const response = await fetch('/help/content.json');
        if (response.ok) {
          const allContent: HelpContent[] = await response.json();
          
          // Find the article by slug
          const foundArticle = allContent.find(item => item.slug === slug || item.id === slug);
          
          if (foundArticle) {
            setArticle(foundArticle);
            
            // Find related articles (same category or similar tags)
            const related = allContent
              .filter(item => 
                item.id !== foundArticle.id && (
                  item.category === foundArticle.category ||
                  item.tags.some(tag => foundArticle.tags.includes(tag))
                )
              )
              .slice(0, 3);
            setRelatedArticles(related);
            
            console.log('[help-fix] Found article:', foundArticle.title);
          } else {
            setNotFound(true);
            console.log('[help-fix] Article not found for slug:', slug);
          }
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error('[help-fix] Failed to load article:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadArticle();
  }, [slug]);

  // Handle deep-link navigation
  useEffect(() => {
    const openParam = searchParams.get('open');
    const slugParam = searchParams.get('slug');
    
    if (openParam === 'article' && slugParam && slugParam !== slug) {
      console.log('[help-fix] Deep-link navigation to:', slugParam);
      navigate(`/help/articles/${slugParam}`, { replace: true });
    }
  }, [searchParams, slug, navigate]);

  const handleBackNavigation = () => {
    const returnUrl = searchParams.get('from');
    if (returnUrl && returnUrl.startsWith('/help')) {
      navigate(returnUrl);
    } else {
      navigate('/help');
    }
  };

  const generateTOC = (content: string) => {
    const headingRegex = /^(#{2,3})\s+(.+)$/gm;
    const headings: { level: number; text: string; id: string }[] = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2];
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      headings.push({ level, text, id });
    }

    return headings;
  };

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

  if (notFound || !article) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The article you're looking for doesn't exist or has been moved.
          </p>
          <Button onClick={() => navigate('/help')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Help Center
          </Button>
        </div>
      </div>
    );
  }

  const tableOfContents = generateTOC(article.content);

  return (
    <div className="container mx-auto p-6">
      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBackNavigation}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to where I was
            </Button>
          </div>

          {/* Article Header */}
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">{article.title}</h1>
              <p className="text-lg text-muted-foreground">{article.description}</p>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Badge variant="outline">{article.category}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Updated {new Date(article.lastUpdated).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                Roles: {article.roles.join(', ')}
              </div>
            </div>

            {article.tags.length > 0 && (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-wrap gap-1">
                  {article.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Article Content */}
          <div className="prose prose-slate max-w-none dark:prose-invert">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-8">{children}</h1>,
                h2: ({ children }) => {
                  const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                  return <h2 id={id} className="text-xl font-semibold mb-3 mt-6">{children}</h2>;
                },
                h3: ({ children }) => {
                  const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                  return <h3 id={id} className="text-lg font-medium mb-2 mt-4">{children}</h3>;
                },
                p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                code: ({ children }) => <code className="bg-muted px-2 py-1 rounded text-sm">{children}</code>,
                pre: ({ children }) => <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>
              }}
            >
              {article.content}
            </ReactMarkdown>
          </div>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <div className="mt-12">
              <Separator className="mb-6" />
              <h3 className="text-lg font-semibold mb-4">Related Articles</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {relatedArticles.map(relatedArticle => (
                  <Card 
                    key={relatedArticle.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/help/articles/${relatedArticle.slug}`)}
                  >
                    <CardHeader>
                      <CardTitle className="text-base">{relatedArticle.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {relatedArticle.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {relatedArticle.category}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar with TOC */}
        {tableOfContents.length > 0 && (
          <div className="w-64 hidden lg:block">
            <div className="sticky top-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Table of Contents</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <ul className="space-y-2 text-sm">
                      {tableOfContents.map((heading, index) => (
                        <li key={index}>
                          <a
                            href={`#${heading.id}`}
                            className={`block hover:text-primary transition-colors ${
                              heading.level === 2 ? 'font-medium' : 'pl-4 text-muted-foreground'
                            }`}
                          >
                            {heading.text}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};