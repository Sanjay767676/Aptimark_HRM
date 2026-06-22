import { useState } from 'react';
import { useListStudents, useDeleteStudent } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Eye, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function StudentsList() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const deleteStudent = useDeleteStudent();
  
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    await deleteStudent.mutateAsync({ id });
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    queryClient.invalidateQueries({ queryKey: ['listStudents'] });
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Are you sure you want to delete the ${selectedIds.length} selected students?`)) return;
    try {
      await Promise.all(selectedIds.map(id => deleteStudent.mutateAsync({ id })));
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['listStudents'] });
      queryClient.invalidateQueries({ queryKey: ['getAdminSummary'] });
      queryClient.invalidateQueries({ queryKey: ['listPayments'] });
      alert('Selected students deleted successfully.');
    } catch (error) {
      console.error(error);
      alert('Failed to delete some students.');
    }
  };
  
  const { data: studentList, isLoading } = useListStudents({ 
    search: search || undefined, 
    status: status !== 'all' ? status : undefined,
    limit: 1000 
  });

  const allIds = studentList?.data.map((student) => student.id) || [];
  const isAllSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground">Manage interns and their details.</p>
        </div>
        <Link href="/hr/students/new">
          <Button data-testid="button-new-student">
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-students"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
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

      <div className="rounded-md border bg-card overflow-hidden">
        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-12 text-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                    checked={isAllSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(allIds);
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="w-12 text-center"><Skeleton className="h-4 w-4 rounded mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[80px] rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-md ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : studentList?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No students found.
                  </TableCell>
                </TableRow>
              ) : (
                studentList?.data.map((student) => {
                  const isSelected = selectedIds.includes(student.id);
                  return (
                    <TableRow key={student.id} className={isSelected ? 'bg-muted/40' : ''}>
                      <TableCell className="w-12 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds((prev) => [...prev, student.id]);
                            } else {
                              setSelectedIds((prev) => prev.filter((id) => id !== student.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>{student.full_name}</div>
                      </TableCell>
                      <TableCell>{student.internship_role}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(student.start_date), 'MMM d, yyyy')} - {format(new Date(student.end_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {student.payment?.payment_status === 'paid' && <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20">Paid</Badge>}
                        {student.payment?.payment_status === 'partial' && <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20">Partial</Badge>}
                        {student.payment?.payment_status === 'pending' && <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-rose-500/20">Pending</Badge>}
                        {!student.payment && <Badge variant="outline">No Data</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/hr/students/${student.id}`}>
                            <Button variant="ghost" size="icon" data-testid={`button-view-student-${student.id}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10" onClick={() => handleDelete(student.id)} disabled={deleteStudent.isPending}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Showing {studentList?.data.length || 0} of {studentList?.total || 0} results
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom duration-300">
          <span className="text-sm font-medium text-foreground">
            {selectedIds.length} student{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds([])}
            >
              Clear Selection
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={deleteStudent.isPending}
            >
              Delete Selected
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
