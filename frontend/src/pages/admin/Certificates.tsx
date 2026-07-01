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
import { Award, Plus, Printer, Trash2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { apiRequest } from '@/lib/api';



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
                        {cert.file_url ? (
                          <Button variant="ghost" size="icon" onClick={() => window.open(cert.file_url, '_blank')}>
                            <FileText className="h-4 w-4 text-blue-500" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" disabled>
                            <Printer className="h-4 w-4 opacity-50" />
                          </Button>
                        )}
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
