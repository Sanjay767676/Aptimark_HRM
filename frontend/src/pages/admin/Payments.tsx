import { useState } from 'react';
import { useListPayments, useUpdatePayment } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

const statusBadge = (status: string) => {
  if (status === 'paid') return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Paid</Badge>;
  if (status === 'partial') return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Partial</Badge>;
  return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20">Pending</Badge>;
};

export default function AdminPayments() {
  const [status, setStatus] = useState('all');
  const [editPayment, setEditPayment] = useState<any>(null);
  const [totalFee, setTotalFee] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: payments, isLoading } = useListPayments({
    status: status !== 'all' ? status : undefined,
  });

  const updateMutation = useUpdatePayment({
    mutation: {
      onSuccess: () => {
        toast({ title: 'Payment updated' });
        queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
        setEditPayment(null);
      },
      onError: () => toast({ title: 'Failed to update payment', variant: 'destructive' }),
    },
  });

  const openEdit = (p: any) => {
    setEditPayment(p);
    setTotalFee(p.total_fee ?? '');
    setAmountPaid(p.amount_paid ?? '');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">Full revenue and payment management.</p>
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="rounded-md border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Total Fee</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : !(payments as any[])?.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    <CreditCard className="mx-auto h-8 w-8 mb-2 opacity-30" />No payment records.
                  </TableCell>
                </TableRow>
              ) : (
                (payments as any[]).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div>{p.student?.full_name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{p.student?.email}</div>
                    </TableCell>
                    <TableCell>{parseFloat(p.total_fee || '0') === 0 ? '' : `₹${parseFloat(p.total_fee).toLocaleString()}`}</TableCell>
                    <TableCell>{parseFloat(p.amount_paid || '0') === 0 ? '' : `₹${parseFloat(p.amount_paid).toLocaleString()}`}</TableCell>
                    <TableCell className={parseFloat(p.balance_amount || '0') > 0 ? 'text-rose-600 font-medium' : 'text-emerald-600 font-medium'}>
                      {parseFloat(p.balance_amount || '0') === 0 ? '' : `₹${parseFloat(p.balance_amount).toLocaleString()}`}
                    </TableCell>
                    <TableCell>{statusBadge(p.payment_status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.updated_at ? format(new Date(p.updated_at), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>

      <Dialog open={!!editPayment} onOpenChange={(o) => !o && setEditPayment(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Payment — {editPayment?.student?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Total Fee (₹)</Label>
              <Input type="number" value={totalFee} onChange={(e) => setTotalFee(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Amount Paid (₹)</Label>
              <Input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPayment(null)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate({ id: editPayment.id, data: { total_fee: parseFloat(totalFee), amount_paid: parseFloat(amountPaid) } })}
              disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
