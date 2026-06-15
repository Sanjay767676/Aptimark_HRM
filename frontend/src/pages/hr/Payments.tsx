import { useState } from 'react';
import { useListPayments } from '@workspace/api-client-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const statusBadge = (status: string) => {
  if (status === 'paid') return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Paid</Badge>;
  if (status === 'partial') return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Partial</Badge>;
  return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20">Pending</Badge>;
};

export default function HrPayments() {
  const [status, setStatus] = useState('all');
  const { data: payments, isLoading } = useListPayments({
    status: status !== 'all' ? status : undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">Track internship payment statuses.</p>
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
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
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : !(payments as any[])?.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    <CreditCard className="mx-auto h-8 w-8 mb-2 opacity-30" />
                    No payment records found.
                  </TableCell>
                </TableRow>
              ) : (
                (payments as any[]).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div>{p.student?.full_name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{p.student?.email}</div>
                    </TableCell>
                    <TableCell>{p.student?.internship_role ?? '—'}</TableCell>
                    <TableCell>{statusBadge(p.payment_status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.updated_at ? format(new Date(p.updated_at), 'MMM d, yyyy') : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </div>
  );
}
