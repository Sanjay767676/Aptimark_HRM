import { useState } from 'react';
import { useListCertificates, useCreateCertificate, useListStudents } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Plus, Printer, Trash2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

function printCertificate(cert: any) {
  const student = cert.student;
  const win = window.open('', '_blank');
  if (!win) return;
  const issueDate = cert.created_at ? format(new Date(cert.created_at), 'MMMM d, yyyy') : '—';
  win.document.write(`
    <!DOCTYPE html><html><head><title>Certificate</title>
    <style>
      body { font-family: Georgia, serif; text-align: center; padding: 80px 60px; color: #1a1a1a; }
      .border { border: 8px double #c8a96e; padding: 40px; max-width: 700px; margin: 0 auto; }
      h2 { font-size: 13px; letter-spacing: 3px; text-transform: uppercase; color: #888; margin-bottom: 8px; }
      h1 { font-size: 36px; margin: 0 0 32px; }
      .name { font-size: 28px; font-style: italic; color: #c8a96e; margin: 16px 0; border-bottom: 1px solid #ddd; padding-bottom: 12px; }
      p { font-size: 15px; line-height: 1.8; color: #444; }
      .sign { margin-top: 48px; display: flex; justify-content: space-around; }
      .sign div { border-top: 1px solid #aaa; padding-top: 8px; min-width: 160px; font-size: 13px; }
    </style></head><body>
    <div class="border">
      <h2>Aptimark Solutions™</h2><h1>Certificate of Completion</h1>
      <p>This is to certify that</p>
      <div class="name">${student?.full_name ?? '—'}</div>
      <p>has successfully completed the internship as<br/><strong>${student?.internship_role ?? '—'}</strong><br/>
      from <strong>${student?.start_date ? format(new Date(student.start_date), 'MMMM d, yyyy') : '—'}</strong> to <strong>${student?.end_date ? format(new Date(student.end_date), 'MMMM d, yyyy') : '—'}</strong>.</p>
      <div class="sign"><div>HR Department<br/>Aptimark Solutions™</div><div>Date: ${issueDate}</div></div>
    </div>
    <script>window.onload=()=>{ window.print(); }</script></body></html>
  `);
  win.document.close();
}

export default function AdminCertificates() {
  const [open, setOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: certs, isLoading } = useListCertificates({});
  const { data: students } = useListStudents({ limit: 100 });
  const createMutation = useCreateCertificate({
    mutation: {
      onSuccess: () => {
        toast({ title: 'Certificate issued' });
        queryClient.invalidateQueries({ queryKey: ['/api/certificates'] });
        setOpen(false);
        setSelectedStudent('');
      },
      onError: () => toast({ title: 'Failed to issue certificate', variant: 'destructive' }),
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/certificates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => {
      toast({ title: 'Certificate removed' });
      queryClient.invalidateQueries({ queryKey: ['/api/certificates'] });
    },
    onError: () => toast({ title: 'Failed to delete certificate', variant: 'destructive' }),
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this certificate?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Certificates</h1>
          <p className="text-muted-foreground">Issue and manage completion certificates.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Issue</Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="rounded-md border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issued On</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : !certs?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    <Award className="mx-auto h-8 w-8 mb-2 opacity-30" />No certificates issued yet.
                  </TableCell>
                </TableRow>
              ) : (
                certs.map((cert: any) => (
                  <TableRow key={cert.id}>
                    <TableCell className="font-medium">
                      <div>{cert.student?.full_name ?? '—'}</div>
                    </TableCell>
                    <TableCell>{cert.student?.internship_role ?? '—'}</TableCell>
                    <TableCell><Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 capitalize">{cert.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{cert.created_at ? format(new Date(cert.created_at), 'MMM d, yyyy') : '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => printCertificate(cert)}><Printer className="h-4 w-4" /></Button>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Issue Certificate</DialogTitle></DialogHeader>
          <div className="py-2">
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger><SelectValue placeholder="Select a student…" /></SelectTrigger>
              <SelectContent>
                {students?.data.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name} — {s.internship_role}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate({ data: { student_id: selectedStudent } })} disabled={!selectedStudent || createMutation.isPending}>
              {createMutation.isPending ? 'Issuing…' : 'Issue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
