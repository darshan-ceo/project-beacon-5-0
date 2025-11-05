import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Search, FileText, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface DocFile {
  id: string;
  title: string;
  path: string;
  content: string;
  category: string;
}

const DOCS_FILES = [
  { id: "readme", title: "Documentation Index", path: "/docs/README.md", category: "Overview" },
  { id: "system", title: "System Documentation", path: "/docs/BACKGROUND_JOBS_SYSTEM.md", category: "Technical" },
  { id: "implementation", title: "Implementation Report", path: "/docs/BACKGROUND_JOBS_IMPLEMENTATION_REPORT.md", category: "Reports" },
  { id: "user-guide", title: "User Guide", path: "/docs/BACKGROUND_JOBS_USER_GUIDE.md", category: "Guides" },
  { id: "operations", title: "Operations Guide", path: "/docs/BACKGROUND_JOBS_OPERATIONS.md", category: "Guides" },
  { id: "quick-ref", title: "Quick Reference", path: "/docs/BACKGROUND_JOBS_QUICK_REFERENCE.md", category: "Reference" },
  { id: "release-notes", title: "Release Notes", path: "/docs/BACKGROUND_JOBS_RELEASE_NOTES.md", category: "Reference" },
  { id: "integration", title: "Integration Guide", path: "/docs/INTEGRATING_BACKGROUND_JOBS.md", category: "Guides" },
  { id: "api", title: "Edge Functions API", path: "/docs/EDGE_FUNCTIONS_REFERENCE.md", category: "Reference" },
];

export function DocViewerPage() {
  const [docs, setDocs] = useState<DocFile[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string>("readme");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDocs = async () => {
      setIsLoading(true);
      const loadedDocs = await Promise.all(
        DOCS_FILES.map(async (file) => {
          try {
            const response = await fetch(file.path);
            const content = await response.text();
            return { ...file, content };
          } catch (error) {
            console.error(`Failed to load ${file.path}:`, error);
            return { ...file, content: "# Document Not Found\n\nThis document could not be loaded." };
          }
        })
      );
      setDocs(loadedDocs);
      setIsLoading(false);
    };

    loadDocs();
  }, []);

  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return docs;

    const query = searchQuery.toLowerCase();
    return docs.filter(
      (doc) =>
        doc.title.toLowerCase().includes(query) ||
        doc.content.toLowerCase().includes(query)
    );
  }, [docs, searchQuery]);

  const currentDoc = docs.find((doc) => doc.id === selectedDoc);

  const groupedDocs = useMemo(() => {
    const groups: Record<string, DocFile[]> = {};
    filteredDocs.forEach((doc) => {
      if (!groups[doc.category]) {
        groups[doc.category] = [];
      }
      groups[doc.category].push(doc);
    });
    return groups;
  }, [filteredDocs]);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Sidebar */}
      <Card className="w-80 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Documentation</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {Object.entries(groupedDocs).map(([category, categoryDocs]) => (
              <div key={category}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  {category}
                </h3>
                <div className="space-y-1">
                  {categoryDocs.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left",
                        selectedDoc === doc.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      )}
                    >
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{doc.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Content Area */}
      <Card className="flex-1 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-8">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">Loading documentation...</div>
              </div>
            ) : currentDoc ? (
              <article className="prose prose-slate dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {currentDoc.content}
                </ReactMarkdown>
              </article>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">Select a document to view</div>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
