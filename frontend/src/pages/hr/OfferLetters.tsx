import { useState } from 'react';
import { useListOfferLetters, useCreateOfferLetter, useListStudents } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Plus, Printer, Trash2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

function printOfferLetter(letter: any) {
  const student = letter.student;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`
    <!DOCTYPE html><html><head><title>Offer Letter</title>
    <style>
      body { font-family: Georgia, serif; max-width: 700px; margin: 60px auto; color: #1a1a1a; line-height: 1.7; }
      h1 { font-size: 22px; margin-bottom: 4px; } .sub { color: #555; font-size: 14px; margin-bottom: 36px; }
      .field { margin-bottom: 8px; } strong { color: #111; }
      .sign { margin-top: 60px; border-top: 1px solid #ccc; padding-top: 16px; }
      @media print { body { margin: 40px; } }
    </style></head><body>
    <h1>Aptimark Solutions™</h1>
    <div class="sub">Internship Offer Letter</div>
    <p>Date: <strong>${format(new Date(letter.created_at ?? new Date()), 'MMMM d, yyyy')}</strong></p>
    <p>Dear <strong>${student?.full_name ?? '—'}</strong>,</p>
    <p>We are pleased to offer you an internship position at <strong>Aptimark Solutions™</strong> as a <strong>${student?.internship_role ?? '—'}</strong>.</p>
    <div class="field"><strong>Internship Period:</strong> ${student?.start_date ? format(new Date(student.start_date), 'MMMM d, yyyy') : '—'} to ${student?.end_date ? format(new Date(student.end_date), 'MMMM d, yyyy') : '—'}</div>
    <p style="margin-top:24px">This offer is contingent upon completion of the required onboarding formalities. We look forward to having you on our team.</p>
    <div class="sign"><p>Warm regards,<br/><strong>HR Department</strong><br/>Aptimark Solutions™</p></div>
    <script>window.onload=()=>{ window.print(); }</script>
    </body></html>
  `);
  win.document.close();
}

export default function OfferLetters() {
  const [open, setOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: letters, isLoading } = useListOfferLetters({});
  const { data: students } = useListStudents({ limit: 100 });
  const createMutation = useCreateOfferLetter({
    mutation: {
      onSuccess: () => {
        toast({ title: 'Offer letter generated' });
        queryClient.invalidateQueries({ queryKey: ['/api/offer-letters'] });
        setOpen(false);
        setSelectedStudent('');
      },
      onError: () => toast({ title: 'Failed to generate offer letter', variant: 'destructive' }),
    },
  });

  const handleGenerate = () => {
    if (!selectedStudent) return;
    createMutation.mutate({ data: { student_id: selectedStudent } });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/offer-letters/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => {
      toast({ title: 'Offer letter removed' });
      queryClient.invalidateQueries({ queryKey: ['/api/offer-letters'] });
    },
    onError: () => toast({ title: 'Failed to delete offer letter', variant: 'destructive' }),
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this offer letter?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Offer Letters</h1>
          <p className="text-muted-foreground">Generate and manage internship offer letters.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Generate
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="rounded-md border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Generated On</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : !letters?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    <FileText className="mx-auto h-8 w-8 mb-2 opacity-30" />
                    No offer letters yet. Generate one above.
                  </TableCell>
                </TableRow>
              ) : (
                letters.map((letter: any) => (
                  <TableRow key={letter.id}>
                    <TableCell className="font-medium">
                      <div>{letter.student?.full_name ?? '—'}</div>
                    </TableCell>
                    <TableCell>{letter.student?.internship_role ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 capitalize">
                        {letter.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {letter.created_at ? format(new Date(letter.created_at), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {letter.file_url ? (
                          <Button variant="ghost" size="icon" onClick={() => window.open(letter.file_url, '_blank')}>
                            <FileText className="h-4 w-4 text-blue-500" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" onClick={() => printOfferLetter(letter)}>
                            <Printer className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(letter.id)} disabled={deleteMutation.isPending}>
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
          <DialogHeader>
            <DialogTitle>Generate Offer Letter</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger>
                <SelectValue placeholder="Select a student…" />
              </SelectTrigger>
              <SelectContent>
                {students?.data.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.full_name} — {s.internship_role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={!selectedStudent || createMutation.isPending}>
              {createMutation.isPending ? 'Generating…' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
