import { useState } from 'react';
import { getListCertificatesQueryKey, useListCertificates, useCreateCertificate, useListStudents, useListOfferLetters } from '@workspace/api-client-react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Plus, Printer, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { apiRequest } from '@/lib/api';

function printCertificate(cert: any, offerLetters: any[] = []) {
  const student = cert.student;
  const win = window.open('', '_blank');
  if (!win) return;
  
  const issueDate = student?.end_date ? format(new Date(student.end_date), 'dd/MM/yy') : (cert.created_at ? format(new Date(cert.created_at), 'dd/MM/yy') : '—');
  const start = student?.start_date ? format(new Date(student.start_date), 'MMMM d, yyyy') : '—';
  const end = student?.end_date ? format(new Date(student.end_date), 'MMMM d, yyyy') : '—';
  const year = new Date().getFullYear();
  
  const studentOffer = offerLetters?.find((o: any) => o.student_id === student?.id);
  const refNo = studentOffer?.reference_number || `AMS/HR/INT/${year}/`;
  
  win.document.write(`
    <!DOCTYPE html><html><head><title>Certificate of Completion</title>
    <link href="https://fonts.googleapis.com/css?family=Alike&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css?family=Alice&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css?family=Montserrat&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css?family=Libertinus+Serif&display=swap" rel="stylesheet" />
    <style>
      * { box-sizing: border-box; }
      body { font-size: 14px; margin: 0; padding: 0; }
      .v16_56 { width: 595px; height: 842px; background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="); background-repeat: no-repeat; background-position: center center; background-size: cover; opacity: 1; position: absolute; top: 0px; left: 0px; overflow: hidden; }
      .v16_57 { width: 595px; height: 842px; background-repeat: no-repeat; background-position: center center; background-size: cover; opacity: 1; position: absolute; top: 0px; left: 0px; overflow: hidden; }
      .v16_58 { width: 595px; height: 842px; background: rgba(255,255,255,1); opacity: 1; position: absolute; top: 0px; left: 0px; }
      .v16_59 { width: 595px; height: 890px; background-repeat: no-repeat; background-position: center center; background-size: cover; opacity: 1; position: absolute; top: 0px; left: 0px; overflow: hidden; }
      .v16_60 { width: 595px; height: 842px; background: rgba(255,255,255,1); opacity: 1; position: absolute; top: 0px; left: 0px; }
      .v16_61 { width: 84px; height: 81px; background-repeat: no-repeat; background-position: center center; background-size: cover; opacity: 1; position: absolute; top: 11px; left: 6px; overflow: hidden; }
      .v16_62 { width: 84px; height: 81px; background-repeat: no-repeat; background-position: center center; background-size: cover; opacity: 1; position: absolute; top: 0px; left: 1px; overflow: hidden; }
      .v16_63 { width: 80px; opacity: 1; position: absolute; top: 100px; left: 390px; border: 0.75px solid rgba(0,0,0,1); transform: rotate(-90deg); }
      .v16_64 { width: 12px; height: 12px; background-repeat: no-repeat; background-position: center center; background-size: cover; opacity: 1; position: absolute; top: 79px; left: 395px; overflow: hidden; }
      .v16_65 { width: 8px; height: 12px; background-repeat: no-repeat; background-position: center center; background-size: cover; opacity: 1; position: absolute; top: 28px; left: 397px; overflow: hidden; }
      .v16_66 { width: 8px; height: 12px; background: rgba(0,0,0,1); opacity: 1; position: absolute; top: 0px; left: 1px; }
      .v16_67 { width: 502px; height: 24px; background-repeat: no-repeat; background-position: center center; background-size: cover; opacity: 1; position: absolute; top: 817px; left: 0px; overflow: hidden; }
      .v16_68 { width: 502px; height: 178px; background: rgba(0,0,0,1); opacity: 1; position: absolute; top: 1px; left: 0px; }
      .v16_69 { width: 123px; height: 24px; background-repeat: no-repeat; background-position: center center; background-size: cover; opacity: 1; position: absolute; top: 818px; left: 472px; overflow: hidden; }
      .v16_70 { width: 178px; height: 31px; background: rgba(0,0,0,1); opacity: 1; position: absolute; top: 1px; left: 0px; }
      .v16_71 { width: 73px; height: 168px; background-repeat: no-repeat; background-position: center center; background-size: cover; opacity: 1; position: absolute; top: 710px; left: 502px; overflow: hidden; }
      .v16_72 { width: 73px; height: 168px; background: rgba(0,0,0,1); opacity: 1; position: absolute; top: 0px; left: 0px; }
      .v16_73 { width: 7px; height: 178px; background: rgba(255,255,255,1); opacity: 1; position: absolute; top: 1px; left: 67px; }
      .v16_74 { width: 73px; height: 168px; background-repeat: no-repeat; background-position: center center; background-size: cover; opacity: 1; position: absolute; top: 722px; left: 514px; overflow: hidden; }
      .v16_75 { width: 73px; height: 168px; background: rgba(0,0,0,1); opacity: 1; position: absolute; top: 0px; left: 0px; }
      .v16_76 { width: 7px; height: 178px; background: rgba(255,255,255,1); opacity: 1; position: absolute; top: 0px; left: 67px; }
      .v16_77 { width: 370px; height: 353px; background-repeat: no-repeat; background-position: center center; background-size: cover; opacity: 1; position: absolute; top: 218px; left: 113px; overflow: hidden; }
      .v16_78 { width: 370px; height: 353px; background: rgba(0,0,0,1); opacity: 1; position: absolute; top: 0px; left: 1px; }
      .v16_79 { width: 370px; height: 353px; background-repeat: no-repeat; background-position: center center; background-size: cover; opacity: 0.05999999865889549; position: absolute; top: 353px; left: 1px; overflow: hidden; }
      .v16_80 { width: 370px; height: 353px; background-repeat: no-repeat; background-position: center center; background-size: cover; opacity: 1; position: absolute; top: 354px; left: 0px; overflow: hidden; }
      .v16_81 { width: 531px; color: rgba(0,0,0,1); position: absolute; top: 248px; left: 44px; font-size: 15px; opacity: 1; text-align: left; }
      .v16_97 { width: 92px; height: 72px; background-repeat: no-repeat; background-position: center center; background-size: cover; opacity: 1; position: absolute; top: 686px; left: 483px; overflow: hidden; }
      .v16_98 { width: 92px; height: 72px; background-repeat: no-repeat; background-position: center center; background-size: cover; opacity: 1; position: absolute; top: 1px; left: 1px; overflow: hidden; }
      .v16_99 { width: 13px; height: 13px; background-repeat: no-repeat; background-position: center center; background-size: cover; opacity: 1; position: absolute; top: 60px; left: 395px; overflow: hidden; }
      .v16_100 { width: 209px; color: rgba(0,0,0,1); position: absolute; top: 31px; left: 94px; font-family: Alike; font-weight: Regular; font-size: 24px; opacity: 1; text-align: left; }
      .v16_101 { width: 216px; color: rgba(0,0,0,1); position: absolute; top: 62px; left: 94px; font-family: Alice; font-weight: Regular; font-size: 13px; opacity: 1; text-align: left; }
      .v16_102 { width: 156px; color: rgba(0,0,0,1); position: absolute; top: 25px; left: 413px; font-family: Alice; font-weight: Regular; font-size: 11px; opacity: 1; text-align: left; }
      .v16_103 { width: 143px; color: rgba(0,0,0,1); position: absolute; top: 78px; left: 412px; font-family: Alice; font-weight: Regular; font-size: 12px; opacity: 1; text-align: left; }
      .v16_104 { width: 164px; color: rgba(0,0,0,1); position: absolute; top: 60px; left: 412px; font-family: Alice; font-weight: Regular; font-size: 12px; opacity: 1; text-align: left; }
      .v16_106 { width: 359px; height: 19px; background-repeat: no-repeat; background-position: center center; background-size: cover; opacity: 1; position: absolute; top: 130px; left: 161px; overflow: hidden; }
      .v16_107 { width: 282px; height: 1px; background: rgba(0,0,0,1); opacity: 1; position: absolute; top: 19px; left: 0px; }
      .v16_108 { width: 353px; color: rgba(0,0,0,1); position: absolute; top: 0px; left: 5px; font-family: Montserrat; font-weight: SemiBold; font-size: 14px; opacity: 1; text-align: left; }
      .v16_111 { width: 146px; color: rgba(0,0,0,1); position: absolute; top: 168px; left: 430px; font-size: 9px; opacity: 1; text-align: left; }
      .v18_3 { width: 141px; color: rgba(0,0,0,1); position: absolute; top: 561px; left: 42px; font-family: Libertinus Serif; font-weight: Regular; font-size: 15px; opacity: 1; text-align: left; }
      .v16_114 { width: 650px; height: 976px; background-repeat: no-repeat; background-position: center center; background-size: cover; opacity: 1; position: absolute; top: 995px; left: 0px; overflow: hidden; }
      .v16_115 { width: 0px; height: 80px; opacity: 1; position: absolute; top: 896px; left: 389px; }
      .v16_116 { width: 8px; height: 12px; opacity: 1; position: absolute; top: 956px; left: 397px; }
      .v16_117 { width: 51px; height: 51px; opacity: 1; position: absolute; top: 246px; left: 77px; }
      .v16_118 { width: 73px; height: 168px; opacity: 1; position: absolute; top: 118px; left: 501px; }
      .v16_119 { width: 73px; height: 168px; opacity: 1; position: absolute; top: 106px; left: 513px; }
      .v16_120 { width: 501px; height: 178px; opacity: 1; position: absolute; top: 0px; left: 0px; }
      .v16_121 { width: 178px; height: 31px; opacity: 1; position: absolute; top: 146px; left: 472px; }
      @media print { body { padding: 40px; } }
    </style></head><body>
    <div class="v16_56">
      <div class="v16_57">
        <div class="v16_58"></div><div class="v16_59"><div class="v16_60"></div><div class="v16_61"><div class="v16_62"></div></div><div class="v16_63"></div><div class="v16_64"></div><div class="v16_65"><div class="v16_66"></div></div><div class="v16_67"><div class="v16_68"></div></div><div class="v16_69"><div class="v16_70"></div></div><div class="v16_71"><div class="v16_72"></div><div class="v16_73"></div></div><div class="v16_74"><div class="v16_75"></div><div class="v16_76"></div></div><div class="v16_77"><div class="v16_78"></div><div class="v16_79"><div class="v16_80"></div></div></div>
        <span class="v16_81">This is to certify that ${student?.full_name ?? '—'} has successfully completed a ${student?.duration ?? '—'} Internship Program in ${student?.internship_role ?? '—'} at Aptimark Solutions from ${start} to ${end}.<br><br>During the internship, ${student?.full_name ?? '—'} demonstrated strong interest and competency in ${student?.internship_role ?? '—'} concepts and their practical applications. Active participation in assigned tasks, analytical thinking, and a positive learning attitude were consistently displayed throughout the program. The dedication and performance demonstrated during the internship were found to be commendable.<br><br>Aptimark Solutions wishes ${student?.full_name ?? '—'} every success in future academic and professional pursuits.</span>
        <div class="v16_97"><div class="v16_98"></div></div><div class="v16_99"></div>
        <span class="v16_100">Aptimark Solutions</span>
        <span class="v16_101">Smart Solutions . Better Tomorrrow</span>
        <span class="v16_102">No -8/2 , Venus Garden Street ,<br>Sundapalayam , Coimbatore.</span>
        <span class="v16_103">www.aptimarksolutions.in</span>
        <span class="v16_104">contact@aptimarksolutions.in</span>
        <div class="v16_106"><div class="v16_107"></div><span class="v16_108">TO WHOMSOEVER IT MAY  CONCERN</span></div>
        <span class="v16_111">Ref No: ${refNo}<br>Date:  ${issueDate}</span>
      </div>
      <span class="v18_3">For Aptimark Solutions</span>
    </div>
    <div class="v16_114"><div class="v16_115"></div><div class="v16_116"></div><div class="v16_117"></div><div class="v16_118"></div><div class="v16_119"></div><div class="v16_120"></div><div class="v16_121"></div></div>
    <script>window.onload=()=>{ window.print(); }</script>
    </body></html>
  `);
  win.document.close();
}

export default function AdminCertificates() {
  const [open, setOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: certs, isLoading } = useListCertificates({});
  const { data: students } = useListStudents({ limit: 100 });
  const { data: offerLetters } = useListOfferLetters({});
  const createMutation = useCreateCertificate({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCertificatesQueryKey({}) });
      },
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/certificates/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast({ title: 'Certificate removed' });
      queryClient.invalidateQueries({ queryKey: getListCertificatesQueryKey({}) });
    },
    onError: () => toast({ title: 'Failed to delete certificate', variant: 'destructive' }),
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this certificate?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredStudents = students?.data.filter((s: any) => 
    s.payment?.payment_status === 'paid' && 
    (s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     s.internship_role.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  const handleGenerate = async () => {
    if (selectedStudents.length === 0) return;
    setIsGeneratingBulk(true);
    setBulkProgress({ current: 0, total: selectedStudents.length });
    
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedStudents.length; i++) {
      const studentId = selectedStudents[i];
      setBulkProgress({ current: i + 1, total: selectedStudents.length });
      try {
        await createMutation.mutateAsync({ data: { student_id: studentId } });
        successCount++;
      } catch (err) {
        failCount++;
      }
    }

    setIsGeneratingBulk(false);
    setSelectedStudents([]);
    setOpen(false);
    
    toast({
      title: 'Bulk issue complete',
      description: `Successfully issued ${successCount} certificate(s).${failCount > 0 ? ` Failed: ${failCount}` : ''}`,
    });
    queryClient.invalidateQueries({ queryKey: getListCertificatesQueryKey({}) });
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isGeneratingBulk) return;
    setOpen(isOpen);
    if (!isOpen) {
      setSelectedStudents([]);
      setSearchQuery('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Certificates</h1>
          <p className="text-muted-foreground">Issue and print internship completion certificates.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Issue Certificate
          </Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="rounded-md border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Internship Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issued On</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : !certs?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    <Award className="mx-auto h-8 w-8 mb-2 opacity-30" />
                    No certificates issued yet.
                  </TableCell>
                </TableRow>
              ) : (
                certs.map((cert: any) => (
                  <TableRow key={cert.id}>
                    <TableCell className="font-medium">
                      <div>{cert.student?.full_name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{cert.student?.email}</div>
                    </TableCell>
                    <TableCell>{cert.student?.internship_role ?? '—'}</TableCell>
                    <TableCell>
                      <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 capitalize" variant="outline">
                        {cert.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cert.created_at ? format(new Date(cert.created_at), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => printCertificate(cert, offerLetters || [])}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(cert.id)} disabled={deleteMutation.isPending}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Issue Certificate</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isGeneratingBulk}
            />

            <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
              <div className="flex items-center space-x-2 border-b pb-2 mb-2">
                <input
                  type="checkbox"
                  id="select-all"
                  className="rounded border-gray-300 accent-primary w-4 h-4 cursor-pointer"
                  checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedStudents(filteredStudents.map((s: any) => s.id));
                    } else {
                      setSelectedStudents([]);
                    }
                  }}
                  disabled={isGeneratingBulk}
                />
                <label htmlFor="select-all" className="text-sm font-semibold cursor-pointer select-none">
                  Select All / Deselect All
                </label>
              </div>

              {filteredStudents.map((s: any) => {
                const isChecked = selectedStudents.includes(s.id);
                return (
                  <div key={s.id} className="flex items-center space-x-2 py-1">
                    <input
                      type="checkbox"
                      id={`student-${s.id}`}
                      className="rounded border-gray-300 accent-primary w-4 h-4 cursor-pointer"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudents([...selectedStudents, s.id]);
                        } else {
                          setSelectedStudents(selectedStudents.filter((id) => id !== s.id));
                        }
                      }}
                      disabled={isGeneratingBulk}
                    />
                    <label htmlFor={`student-${s.id}`} className="text-sm cursor-pointer select-none flex-1">
                      {s.full_name} <span className="text-muted-foreground text-xs">— {s.internship_role}</span>
                    </label>
                  </div>
                );
              })}

              {filteredStudents.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-4">
                  No eligible students found.
                </div>
              )}
            </div>

            {isGeneratingBulk && (
              <div className="text-sm text-center text-muted-foreground animate-pulse">
                Issuing {bulkProgress.current} of {bulkProgress.total} certificates...
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isGeneratingBulk}>Cancel</Button>
            <Button
              onClick={handleGenerate}
              disabled={selectedStudents.length === 0 || isGeneratingBulk}
            >
              {isGeneratingBulk ? 'Issuing…' : `Issue (${selectedStudents.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
