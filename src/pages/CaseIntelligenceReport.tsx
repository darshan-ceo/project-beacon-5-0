import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Download, Printer, Camera, X, Loader2, BarChart3 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  fetchCaseIntelligence, 
  saveIntelligenceSnapshot, 
  type IntelligenceData 
} from '@/services/caseIntelligenceService';
import { IntelligenceSidebar } from '@/components/intelligence/IntelligenceSidebar';
import { IntelligenceCover } from '@/components/intelligence/IntelligenceCover';
import { ExecutiveSummary } from '@/components/intelligence/ExecutiveSummary';
import { LifecycleIntelligence } from '@/components/intelligence/LifecycleIntelligence';
import { NoticesRepliesSummary } from '@/components/intelligence/NoticesRepliesSummary';
import { StageClosureSummary } from '@/components/intelligence/StageClosureSummary';
import { FinancialExposure } from '@/components/intelligence/FinancialExposure';
import { HearingsSummary } from '@/components/intelligence/HearingsSummary';
import { DocumentIndex } from '@/components/intelligence/DocumentIndex';
import { RiskActionMatrix } from '@/components/intelligence/RiskActionMatrix';

const CaseIntelligenceReport: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [snapshotting, setSnapshotting] = useState(false);
  const [activeSection, setActiveSection] = useState('cover');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchCaseIntelligence(id)
      .then(setData)
      .catch((err) => {
        console.error('Failed to load intelligence:', err);
        toast({ title: 'Error', description: 'Failed to load Case Intelligence Report.', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Intersection observer for active section tracking
  useEffect(() => {
    if (!contentRef.current) return;
    const sections = contentRef.current.querySelectorAll('section[id]');
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
    );
    sections.forEach(s => observer.observe(s));
    return () => observer.disconnect();
  }, [data]);

  const handleNavigate = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handlePrint = () => window.print();

  const handleDownloadPDF = () => {
    // Use browser print-to-PDF for simplicity and layout consistency
    window.print();
  };

  const handleSnapshot = async () => {
    if (!data || !id) return;
    setSnapshotting(true);
    try {
      await saveIntelligenceSnapshot(id, data);
      toast({ title: 'Snapshot Saved', description: 'Intelligence snapshot has been frozen successfully.' });
    } catch (err) {
      console.error('Snapshot error:', err);
      toast({ title: 'Error', description: 'Failed to save snapshot.', variant: 'destructive' });
    } finally {
      setSnapshotting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Generating Intelligence Report...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">Unable to generate report.</p>
          <Button variant="outline" onClick={() => navigate('/cases')}>Back to Cases</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="text-sm font-semibold text-foreground">Case Intelligence Report</h1>
            <span className="text-xs text-muted-foreground">— {data.case.caseNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="h-3.5 w-3.5 mr-1" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5 mr-1" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleSnapshot} disabled={snapshotting}>
              {snapshotting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Camera className="h-3.5 w-3.5 mr-1" />}
              Freeze Snapshot
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/cases')}>
              <X className="h-3.5 w-3.5 mr-1" />
              Close
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        <IntelligenceSidebar activeSection={activeSection} onNavigate={handleNavigate} />
        
        <div ref={contentRef} className="flex-1 space-y-10 min-w-0">
          <IntelligenceCover data={data} />
          <ExecutiveSummary data={data} />
          <LifecycleIntelligence data={data} />
          <NoticesRepliesSummary notices={data.notices} replies={data.replies} />
          <StageClosureSummary closures={data.closures} />
          <FinancialExposure financial={data.financial} />
          <HearingsSummary hearings={data.hearings} />
          <DocumentIndex documents={data.documents} />
          <RiskActionMatrix data={data} />

          {/* Footer */}
          <footer className="text-center text-xs text-muted-foreground border-t pt-4 pb-8 print:pb-2">
            <p className="font-medium text-destructive uppercase tracking-widest mb-1">
              Confidential — Legal Privilege
            </p>
            <p>
              Generated on {format(new Date(data.generatedAt), 'dd MMM yyyy, HH:mm')} by {data.generatedByName}
            </p>
            <p className="mt-1">Case Intelligence Engine — Beacon Litigation Platform</p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default CaseIntelligenceReport;
