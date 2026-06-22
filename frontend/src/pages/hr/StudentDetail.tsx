import { useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useGetStudent, useUpdateStudent, useUpdatePayment, getGetStudentQueryKey, getListStudentsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, User, CreditCard } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const studentUpdateSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  internship_role: z.string().min(1, 'Role is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
});

const paymentUpdateSchema = z.object({
  total_fee: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().min(0),
  ),
  amount_paid: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().min(0),
  ),
});

export default function StudentDetail() {
  const [location, setLocation] = useLocation();
  const [, hrParams] = useRoute('/hr/students/:id');
  const [, adminParams] = useRoute('/admin/students/:id');
  const id = hrParams?.id || adminParams?.id || '';
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const redirectPath = location.startsWith('/admin') ? '/admin/students' : '/hr/students';

  const { data: student, isLoading } = useGetStudent(id, { 
    query: { enabled: !!id, queryKey: getGetStudentQueryKey(id) } 
  });
  
  const updateStudent = useUpdateStudent();
  const updatePayment = useUpdatePayment();

  const studentForm = useForm<z.infer<typeof studentUpdateSchema>>({
    resolver: zodResolver(studentUpdateSchema),
  });

  const paymentForm = useForm<z.infer<typeof paymentUpdateSchema>>({
    resolver: zodResolver(paymentUpdateSchema),
  });

  useEffect(() => {
    if (student) {
      studentForm.reset({
        full_name: student.full_name,
        email: student.email ?? '',
        internship_role: student.internship_role,
        start_date: student.start_date.split('T')[0],
        end_date: student.end_date.split('T')[0],
      });
      if (student.payment) {
        paymentForm.reset({
          total_fee: student.payment.total_fee,
          amount_paid: student.payment.amount_paid,
        });
      }
    }
  }, [student, studentForm, paymentForm]);

  const onStudentSubmit = (data: z.infer<typeof studentUpdateSchema>) => {
    updateStudent.mutate(
      { id, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetStudentQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
          toast({ title: 'Student details updated' });
        },
        onError: () => toast({ title: 'Failed to update student', variant: 'destructive' })
      }
    );
  };

  const onPaymentSubmit = (data: z.infer<typeof paymentUpdateSchema>) => {
    if (!student?.payment?.id) return;
    
    updatePayment.mutate(
      { id: student.payment.id, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetStudentQueryKey(id) });
          toast({ title: 'Payment details updated' });
        },
        onError: () => toast({ title: 'Failed to update payment', variant: 'destructive' })
      }
    );
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!student) {
    return <div>Student not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation(redirectPath)} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{student.full_name}</h1>
          <p className="text-muted-foreground">{student.internship_role}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update student details</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...studentForm}>
                <form onSubmit={studentForm.handleSubmit(onStudentSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                       control={studentForm.control}
                       name="full_name"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Full Name</FormLabel>
                           <FormControl><Input {...field} /></FormControl>
                         </FormItem>
                       )}
                     />
                     <FormField
                       control={studentForm.control}
                       name="email"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Email Address (Optional)</FormLabel>
                           <FormControl><Input {...field} type="email" placeholder="email@example.com" /></FormControl>
                         </FormItem>
                       )}
                     />
                     <FormField
                       control={studentForm.control}
                       name="internship_role"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Role</FormLabel>
                           <FormControl><Input {...field} /></FormControl>
                         </FormItem>
                       )}
                     />
                     <FormField
                      control={studentForm.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <DatePicker value={field.value} onChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={studentForm.control}
                      name="end_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <DatePicker value={field.value} onChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={updateStudent.isPending}>
                      {updateStudent.isPending ? 'Saving...' : 'Save Details'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Payment Details</CardTitle>
                <CardDescription>Manage fees and payments</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {student.payment ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg border">
                    <span className="text-sm font-medium">Status</span>
                    {student.payment.payment_status === 'paid' && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Paid</Badge>}
                    {student.payment.payment_status === 'partial' && <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Partial</Badge>}
                    {student.payment.payment_status === 'pending' && <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20">Pending</Badge>}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Fee:</span>
                      <span className="font-medium">₹{parseFloat(String(student.payment.total_fee ?? 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount Paid:</span>
                      <span className="font-medium text-emerald-600">₹{parseFloat(String(student.payment.amount_paid ?? 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 mt-2">
                      <span className="font-medium">Balance Due:</span>
                      <span className="font-bold text-rose-600">₹{parseFloat(String(student.payment.balance_amount ?? 0)).toLocaleString()}</span>
                    </div>
                  </div>

                  <Form {...paymentForm}>
                    <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4 pt-4 border-t">
                      <FormField
                        control={paymentForm.control}
                        name="total_fee"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Fee (₹)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="1"
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={paymentForm.control}
                        name="amount_paid"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount Paid (₹)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="1"
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={updatePayment.isPending}>
                        Update Payment
                      </Button>
                    </form>
                  </Form>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No payment record associated.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
