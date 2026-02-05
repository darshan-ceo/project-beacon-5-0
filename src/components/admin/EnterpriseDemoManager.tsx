 /**
  * Enterprise Demo Data Manager
  * Admin UI for seeding and purging demo case studies
  */
 
 import { useState, useEffect } from 'react';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Alert, AlertDescription } from '@/components/ui/alert';
 import { Badge } from '@/components/ui/badge';
 import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
 } from '@/components/ui/alert-dialog';
 import { useToast } from '@/hooks/use-toast';
 import { Loader2, Database, Trash2, Play, Eye, CheckCircle, XCircle, AlertTriangle, Beaker } from 'lucide-react';
 import { enterpriseDemoSeeder, DemoDataStatus, DemoSeedResult, PurgeResult } from '@/services/enterpriseDemoSeeder';
 import { useNavigate } from 'react-router-dom';
 
 interface CaseStudyInfo {
   id: string;
   name: string;
   description: string;
   client: string;
   status: string;
   statusColor: string;
 }
 
 const CASE_STUDIES: CaseStudyInfo[] = [
   {
     id: 'CS1_HAPPY_PATH',
     name: 'Happy Path',
     description: 'Straightforward GST ITC dispute resolved favorably in 45 days',
     client: 'Shree Ganesh Textiles Pvt Ltd',
     status: 'Completed',
     statusColor: 'bg-green-500',
   },
   {
     id: 'CS2_COMPLEX',
     name: 'Complex Workflow',
     description: 'Multi-year GST audit with reassignments, appeals, and iterations',
     client: 'Mehta Industries Group',
     status: 'In Progress',
     statusColor: 'bg-amber-500',
   },
   {
     id: 'CS3_EXCEPTION',
     name: 'Risk & Exception',
     description: 'High-risk fake invoice investigation with escalations and settlement',
     client: 'Sunrise Exports Ltd',
     status: 'Resolved',
     statusColor: 'bg-blue-500',
   },
 ];
 
 export const EnterpriseDemoManager = () => {
   const [status, setStatus] = useState<DemoDataStatus | null>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [isSeeding, setIsSeeding] = useState(false);
   const [isPurging, setIsPurging] = useState(false);
   const [seedingCaseStudy, setSeedingCaseStudy] = useState<string | null>(null);
   const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
   const [lastResult, setLastResult] = useState<{ type: 'seed' | 'purge'; data: any } | null>(null);
   const { toast } = useToast();
   const navigate = useNavigate();
 
   useEffect(() => {
     checkStatus();
   }, []);
 
   const checkStatus = async () => {
     setIsLoading(true);
     try {
       await enterpriseDemoSeeder.initialize();
       const demoStatus = await enterpriseDemoSeeder.checkForExistingDemoData();
       setStatus(demoStatus);
     } catch (error) {
       console.error('Failed to check demo status:', error);
     } finally {
       setIsLoading(false);
     }
   };
 
   const handleSeedAll = async () => {
     setIsSeeding(true);
     setLastResult(null);
     
     try {
       toast({
         title: '🚀 Seeding Demo Data',
         description: 'Creating 3 comprehensive case studies...',
       });
 
       const result = await enterpriseDemoSeeder.seedAll();
       setLastResult({ type: 'seed', data: result });
 
       if (result.success) {
         toast({
           title: '✅ Demo Data Seeded Successfully',
           description: `Created ${result.results.reduce((acc, r) => 
             acc + Object.values(r.recordsCreated).reduce((a, b) => a + b, 0), 0)} records across 3 case studies.`,
         });
       } else {
         toast({
           title: '⚠️ Seeding Completed with Errors',
           description: result.errors.join(', '),
           variant: 'destructive',
         });
       }
 
       await checkStatus();
     } catch (error: any) {
       toast({
         title: '❌ Seeding Failed',
         description: error.message,
         variant: 'destructive',
       });
     } finally {
       setIsSeeding(false);
     }
   };
 
   const handleSeedCaseStudy = async (caseStudyId: string) => {
     setSeedingCaseStudy(caseStudyId);
     
     try {
       let result: DemoSeedResult;
       
       switch (caseStudyId) {
         case 'CS1_HAPPY_PATH':
           result = await enterpriseDemoSeeder.seedCaseStudy1();
           break;
         case 'CS2_COMPLEX':
           result = await enterpriseDemoSeeder.seedCaseStudy2();
           break;
         case 'CS3_EXCEPTION':
           result = await enterpriseDemoSeeder.seedCaseStudy3();
           break;
         default:
           throw new Error('Unknown case study');
       }
 
       if (result.success) {
         const total = Object.values(result.recordsCreated).reduce((a, b) => a + b, 0);
         toast({
           title: '✅ Case Study Seeded',
           description: `Created ${total} records for ${CASE_STUDIES.find(c => c.id === caseStudyId)?.name}`,
         });
       } else {
         toast({
           title: '⚠️ Seeding Failed',
           description: result.errors.join(', '),
           variant: 'destructive',
         });
       }
 
       await checkStatus();
     } catch (error: any) {
       toast({
         title: '❌ Error',
         description: error.message,
         variant: 'destructive',
       });
     } finally {
       setSeedingCaseStudy(null);
     }
   };
 
   const handlePurge = async () => {
     setShowPurgeConfirm(false);
     setIsPurging(true);
     setLastResult(null);
 
     try {
       toast({
         title: '🧹 Purging Demo Data',
         description: 'Removing all demo records...',
       });
 
       const result = await enterpriseDemoSeeder.purgeAllDemoData();
       setLastResult({ type: 'purge', data: result });
 
       if (result.success) {
         toast({
           title: '✅ Demo Data Purged',
           description: `Deleted ${result.totalDeleted} demo records.`,
         });
       } else {
         toast({
           title: '⚠️ Purge Completed with Errors',
           description: result.errors.join(', '),
           variant: 'destructive',
         });
       }
 
       await checkStatus();
     } catch (error: any) {
       toast({
         title: '❌ Purge Failed',
         description: error.message,
         variant: 'destructive',
       });
     } finally {
       setIsPurging(false);
     }
   };
 
   const handleViewCases = () => {
     navigate('/cases');
   };
 
   if (isLoading) {
     return (
       <Card>
         <CardContent className="flex items-center justify-center py-8">
           <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
           <span className="ml-2 text-muted-foreground">Checking demo data status...</span>
         </CardContent>
       </Card>
     );
   }
 
   return (
     <>
       <Card>
         <CardHeader>
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
               <Beaker className="h-5 w-5 text-primary" />
               <CardTitle>Enterprise Demo Data</CardTitle>
             </div>
             {status?.exists && (
               <Badge variant="secondary" className="gap-1">
                 <Database className="h-3 w-3" />
                 {status.totalRecords} Demo Records
               </Badge>
             )}
           </div>
           <CardDescription>
             Inject 3 comprehensive case studies demonstrating full application capabilities.
             All demo data is tagged for easy identification and one-click removal.
           </CardDescription>
         </CardHeader>
         <CardContent className="space-y-6">
           {/* Status Alert */}
           <Alert variant={status?.exists ? 'default' : undefined}>
             {status?.exists ? (
               <>
                 <CheckCircle className="h-4 w-4 text-green-600" />
                 <AlertDescription className="flex items-center justify-between">
                   <span>
                     <strong>Demo data is active.</strong> {status.counts.cases} cases, {status.counts.hearings} hearings, 
                     {status.counts.tasks} tasks, and {status.counts.timeline} timeline entries.
                   </span>
                   <Button variant="outline" size="sm" onClick={handleViewCases} className="ml-4">
                     <Eye className="h-4 w-4 mr-1" />
                     View Cases
                   </Button>
                 </AlertDescription>
               </>
             ) : (
               <>
                 <AlertTriangle className="h-4 w-4" />
                 <AlertDescription>
                   <strong>No demo data found.</strong> Seed demo data to demonstrate application features.
                 </AlertDescription>
               </>
             )}
           </Alert>
 
           {/* Main Actions */}
           <div className="flex gap-3">
             <Button 
               onClick={handleSeedAll} 
               disabled={isSeeding || isPurging}
               className="flex-1"
             >
               {isSeeding ? (
                 <>
                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                   Seeding All Case Studies...
                 </>
               ) : (
                 <>
                   <Play className="mr-2 h-4 w-4" />
                   Seed All 3 Case Studies
                 </>
               )}
             </Button>
 
             <Button 
               variant="destructive"
               onClick={() => setShowPurgeConfirm(true)} 
               disabled={isSeeding || isPurging || !status?.exists}
             >
               {isPurging ? (
                 <>
                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                   Purging...
                 </>
               ) : (
                 <>
                   <Trash2 className="mr-2 h-4 w-4" />
                   Purge All Demo Data
                 </>
               )}
             </Button>
           </div>
 
           {/* Case Studies Grid */}
           <div className="grid gap-4">
             <h4 className="font-medium text-sm text-muted-foreground">Individual Case Studies</h4>
             {CASE_STUDIES.map((cs) => (
               <div 
                 key={cs.id}
                 className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
               >
                 <div className="flex-1">
                   <div className="flex items-center gap-2 mb-1">
                     <span className="font-medium">{cs.name}</span>
                     <Badge variant="outline" className={`text-xs text-white ${cs.statusColor}`}>
                       {cs.status}
                     </Badge>
                   </div>
                   <p className="text-sm text-muted-foreground">{cs.description}</p>
                   <p className="text-xs text-muted-foreground mt-1">Client: {cs.client}</p>
                 </div>
                 <div className="flex gap-2 ml-4">
                   <Button
                     size="sm"
                     variant="outline"
                     onClick={() => handleSeedCaseStudy(cs.id)}
                     disabled={isSeeding || isPurging || seedingCaseStudy !== null}
                   >
                     {seedingCaseStudy === cs.id ? (
                       <Loader2 className="h-4 w-4 animate-spin" />
                     ) : (
                       <>
                         <Play className="h-4 w-4 mr-1" />
                         Seed
                       </>
                     )}
                   </Button>
                 </div>
               </div>
             ))}
           </div>
 
           {/* Last Result */}
           {lastResult && (
             <div className="pt-4 border-t">
               <h4 className="font-medium text-sm mb-3">
                 Last Operation: {lastResult.type === 'seed' ? 'Seeding' : 'Purge'}
               </h4>
               {lastResult.type === 'seed' && lastResult.data.results && (
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                   {lastResult.data.results.map((r: DemoSeedResult) => (
                     <div key={r.caseStudy} className="p-2 bg-muted/50 rounded">
                       <div className="flex items-center gap-1 mb-1">
                         {r.success ? (
                           <CheckCircle className="h-3 w-3 text-green-600" />
                         ) : (
                           <XCircle className="h-3 w-3 text-destructive" />
                         )}
                         <span className="font-medium text-xs">{r.caseStudy}</span>
                       </div>
                       <div className="text-xs text-muted-foreground">
                         {Object.values(r.recordsCreated).reduce((a, b) => a + b, 0)} records
                       </div>
                     </div>
                   ))}
                 </div>
               )}
               {lastResult.type === 'purge' && (
                 <div className="p-3 bg-muted/50 rounded">
                   <div className="flex items-center gap-2 mb-2">
                     {lastResult.data.success ? (
                       <CheckCircle className="h-4 w-4 text-green-600" />
                     ) : (
                       <XCircle className="h-4 w-4 text-destructive" />
                     )}
                     <span className="font-medium">
                       {lastResult.data.success ? 'Purge Successful' : 'Purge Failed'}
                     </span>
                   </div>
                   <p className="text-sm text-muted-foreground">
                     Deleted {lastResult.data.totalDeleted} total records
                   </p>
                 </div>
               )}
             </div>
           )}
         </CardContent>
       </Card>
 
       {/* Purge Confirmation Dialog */}
       <AlertDialog open={showPurgeConfirm} onOpenChange={setShowPurgeConfirm}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Purge All Demo Data?</AlertDialogTitle>
             <AlertDialogDescription>
               This will permanently delete all demo records tagged with batch ID "BEACON_DEMO_V1".
               {status && (
                 <div className="mt-4 p-3 bg-muted rounded text-sm">
                   <p className="font-medium mb-2">Records to be deleted:</p>
                   <ul className="space-y-1">
                     <li>Cases: {status.counts.cases}</li>
                     <li>Hearings: {status.counts.hearings}</li>
                     <li>Tasks: {status.counts.tasks}</li>
                     <li>Documents: {status.counts.documents}</li>
                     <li>Timeline Entries: {status.counts.timeline}</li>
                     <li>Communication Logs: {status.counts.communications}</li>
                   </ul>
                   <p className="mt-2 font-semibold">Total: {status.totalRecords} records</p>
                 </div>
               )}
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Cancel</AlertDialogCancel>
             <AlertDialogAction 
               onClick={handlePurge}
               className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
             >
               Purge Demo Data
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </>
   );
 };