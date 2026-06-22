import { useState } from 'react';
import { getListOfferLettersQueryKey, useListOfferLetters, useCreateOfferLetter, useListStudents } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Plus, Printer, Trash2, Mail } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { apiRequest } from '@/lib/api';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

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
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedMailIds, setSelectedMailIds] = useState<string[]>([]);
  const [mailOpen, setMailOpen] = useState(false);
  const [senderEmail, setSenderEmail] = useState('contact@aptimarksolutions.in');
  const [congratsMsg, setCongratsMsg] = useState('Dear {name},\n\nCongratulations! We are pleased to offer you an internship at Aptimark Solutions. Please find your offer letter attached.\n\nWarm regards,\nHR Department');
  const [isSendingMail, setIsSendingMail] = useState(false);

  const { data: letters, isLoading } = useListOfferLetters({});
  const { data: students } = useListStudents({ limit: 100 });
  const createMutation = useCreateOfferLetter({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOfferLettersQueryKey({}) });
      },
    },
  });

  const filteredStudents = students?.data.filter((s: any) => 
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.internship_role.toLowerCase().includes(searchQuery.toLowerCase())
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
      title: 'Bulk generation complete',
      description: `Successfully generated ${successCount} offer letter(s).${failCount > 0 ? ` Failed: ${failCount}` : ''}`,
    });
    queryClient.invalidateQueries({ queryKey: getListOfferLettersQueryKey({}) });
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isGeneratingBulk) return;
    setOpen(isOpen);
    if (!isOpen) {
      setSelectedStudents([]);
      setSearchQuery('');
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/offer-letters/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast({ title: 'Offer letter removed' });
      queryClient.invalidateQueries({ queryKey: getListOfferLettersQueryKey({}) });
    },
    onError: () => toast({ title: 'Failed to delete offer letter', variant: 'destructive' }),
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this offer letter?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleOpenSendMail = () => {
    const missingEmails = selectedMailIds.map(id => {
      const letter = letters?.find((l: any) => l.id === id);
      return letter?.student;
    }).filter(student => !student?.email);

    if (missingEmails.length > 0) {
      alert(`The following student(s) do not have a registered email: ${missingEmails.map(s => s.full_name).join(', ')}. Please add their email ID first.`);
      return;
    }

    setMailOpen(true);
  };

  const handleSendMail = async () => {
    setIsSendingMail(true);
    try {
      await apiRequest('/api/offer-letters/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedMailIds,
          sender_email: senderEmail,
          message: congratsMsg
        })
      });
      toast({ title: 'Emails queued successfully' });
      setSelectedMailIds([]);
      setMailOpen(false);
      queryClient.invalidateQueries({ queryKey: getListOfferLettersQueryKey({}) });
    } catch (err: any) {
      toast({ title: 'Failed to queue emails', variant: 'destructive' });
    } finally {
      setIsSendingMail(false);
    }
  };

  const getEmailStatusDot = (status: string) => {
    if (status === 'success') {
      return (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
          <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
          Success
        </div>
      );
    }
    if (status === 'failed') {
      return (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
          <span className="h-2 w-2 rounded-full bg-rose-500 ring-2 ring-rose-500/20" />
          Failed
        </div>
      );
    }
    if (status === 'pending') {
      return (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
          <span className="h-2 w-2 rounded-full bg-amber-500 ring-2 ring-amber-500/20 animate-pulse" />
          Pending
        </div>
      );
    }
    return <span className="text-xs text-muted-foreground">—</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Offer Letters</h1>
          <p className="text-muted-foreground">Generate and manage internship offer letters.</p>
        </div>
        <div className="flex gap-2">
          {selectedMailIds.length > 0 && (
            <Button variant="outline" className="border-primary text-primary hover:bg-primary/5" onClick={handleOpenSendMail}>
              <Mail className="mr-2 h-4 w-4" /> Send Mail ({selectedMailIds.length})
            </Button>
          )}
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Generate
          </Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="rounded-md border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 accent-primary w-4 h-4 cursor-pointer"
                    checked={letters?.length > 0 && selectedMailIds.length === letters.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMailIds(letters.map((l: any) => l.id));
                      } else {
                        setSelectedMailIds([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mail Status</TableHead>
                <TableHead>Generated On</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : !letters?.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    <FileText className="mx-auto h-8 w-8 mb-2 opacity-30" />
                    No offer letters yet. Generate one above.
                  </TableCell>
                </TableRow>
              ) : (
                letters.map((letter: any) => (
                  <TableRow key={letter.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 accent-primary w-4 h-4 cursor-pointer"
                        checked={selectedMailIds.includes(letter.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMailIds([...selectedMailIds, letter.id]);
                          } else {
                            setSelectedMailIds(selectedMailIds.filter((id) => id !== letter.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>{letter.student?.full_name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{letter.student?.email}</div>
                    </TableCell>
                    <TableCell>{letter.student?.internship_role ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 capitalize">
                        {letter.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getEmailStatusDot(letter.email_status)}
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

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Offer Letter</DialogTitle>
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
                  No students found matching search.
                </div>
              )}
            </div>

            {isGeneratingBulk && (
              <div className="text-sm text-center text-muted-foreground animate-pulse">
                Generating {bulkProgress.current} of {bulkProgress.total} offer letters...
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isGeneratingBulk}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={selectedStudents.length === 0 || isGeneratingBulk}>
              {isGeneratingBulk ? 'Generating…' : `Generate (${selectedStudents.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mailOpen} onOpenChange={setMailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Congrats Email</DialogTitle>
            <DialogDescription>
              Queue congrats emails to the selected {selectedMailIds.length} student(s) with their offer letters attached.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="senderEmail">Sender Email Address</Label>
              <Input
                id="senderEmail"
                type="email"
                placeholder="sender@example.com"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="congratsMessage">Congrats Message</Label>
              <Textarea
                id="congratsMessage"
                rows={6}
                value={congratsMsg}
                onChange={(e) => setCongratsMsg(e.target.value)}
                placeholder="Write your congratulations message here..."
              />
              <p className="text-xs text-muted-foreground">
                You can use <strong>{`{name}`}</strong> as a placeholder for the student's full name.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMailOpen(false)} disabled={isSendingMail}>Cancel</Button>
            <Button onClick={handleSendMail} disabled={isSendingMail || !senderEmail || !congratsMsg}>
              {isSendingMail ? 'Queueing...' : 'Send Mail'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
