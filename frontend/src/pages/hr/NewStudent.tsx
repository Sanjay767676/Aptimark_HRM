import { useState } from 'react';
import { useLocation } from 'wouter';
import { useCreateStudent, getListStudentsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, FileSpreadsheet, Upload } from 'lucide-react';

const studentSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  internship_role: z.string().min(1, 'Role is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  total_fee: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().min(0).optional(),
  ),
  amount_paid: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().min(0).optional(),
  ),
});

type StudentFormValues = z.infer<typeof studentSchema>;
type ImportedStudent = StudentFormValues & { rowNumber: number };

const columnAliases = {
  full_name: ['fullname', 'name', 'studentname', 'student', 'candidatename', 'internname', 'Name'],
  email: ['email', 'emailaddress', 'mail', 'Email ID'],
  internship_role: ['internshiprole', 'role', 'domain', 'internshipdomain', 'position', 'course', 'CHOOSE YOUR PREFERRED DOMAIN'],
  start_date: ['startdate', 'fromdate', 'joiningdate', 'dateofjoining'],
  end_date: ['enddate', 'todate', 'completiondate', 'lastdate'],
  total_fee: ['totalfee', 'fee', 'fees', 'coursefee', 'internshipfee'],
  amount_paid: ['amountpaid', 'paid', 'paidamount', 'payment', 'amountreceived'],
} as const;

function normalizeColumnName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildNormalizedRow(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeColumnName(key), value]),
  ) as Record<string, unknown>;
}

function pickValue(row: Record<string, unknown>, aliases: readonly string[]) {
  for (const alias of aliases) {
    const value = row[alias];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return undefined;
}

function toText(value: unknown) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function toNumber(value: unknown) {
  if (value === undefined || value === null || String(value).trim() === '') return undefined;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toDateString(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split('T')[0];
  }

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }

  const text = toText(value);
  const dateMatch = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (dateMatch) {
    const [, day, month, rawYear] = dateMatch;
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsedDate = new Date(text);
  return Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toISOString().split('T')[0];
}

async function readStudentsFromExcel(file: File) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return { students: [] as ImportedStudent[], skipped: 0 };

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheetName], {
    defval: '',
  });

  const students: ImportedStudent[] = [];
  let skipped = 0;

  rows.forEach((rawRow, index) => {
    const row = buildNormalizedRow(rawRow);
    const student = {
      rowNumber: index + 2,
      full_name: toText(pickValue(row, columnAliases.full_name)),
      email: toText(pickValue(row, columnAliases.email)),
      internship_role: toText(pickValue(row, columnAliases.internship_role)),
      start_date: toDateString(pickValue(row, columnAliases.start_date)),
      end_date: toDateString(pickValue(row, columnAliases.end_date)),
      total_fee: toNumber(pickValue(row, columnAliases.total_fee)),
      amount_paid: toNumber(pickValue(row, columnAliases.amount_paid)),
    };

    const parsed = studentSchema.safeParse(student);
    if (parsed.success) {
      students.push({ ...parsed.data, rowNumber: student.rowNumber });
    } else {
      skipped++;
    }
  });

  return { students, skipped };
}

export default function NewStudent() {
  const [location, setLocation] = useLocation();
  const [importedStudents, setImportedStudents] = useState<ImportedStudent[]>([]);
  const [skippedRows, setSkippedRows] = useState(0);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createStudent = useCreateStudent();

  const redirectPath = location.startsWith('/admin') ? '/admin/students' : '/hr/students';

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      full_name: '',
      email: '',
      internship_role: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0],
      total_fee: undefined,
      amount_paid: undefined,
    },
  });

  const onSubmit = (data: StudentFormValues) => {
    const payload = {
      ...data,
      email: data.email ?? '',
    };

    createStudent.mutate(
      { data: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
          toast({ title: 'Student added successfully' });
          setLocation(redirectPath);
        },
        onError: (error: any) => {
          toast({
            title: 'Failed to add student',
            description: error.message || 'An error occurred',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleExcelChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsReadingFile(true);
    try {
      const { students, skipped } = await readStudentsFromExcel(file);
      setImportedStudents(students);
      setSkippedRows(skipped);
      toast({
        title: students.length ? 'Excel file ready' : 'No valid students found',
        description: `${students.length} valid row(s) found.${skipped ? ` ${skipped} row(s) skipped.` : ''}`,
        variant: students.length ? 'default' : 'destructive',
      });
    } catch (error: any) {
      setImportedStudents([]);
      setSkippedRows(0);
      toast({
        title: 'Failed to read Excel file',
        description: error.message || 'Please upload a valid .xlsx, .xls, or .csv file.',
        variant: 'destructive',
      });
    } finally {
      setIsReadingFile(false);
    }
  };

  const handleImportStudents = async () => {
    if (!importedStudents.length) return;

    setIsImporting(true);
    let successCount = 0;
    let failCount = 0;

    for (const student of importedStudents) {
      try {
        const { rowNumber, ...data } = student;
        await createStudent.mutateAsync({
          data: {
            ...data,
            email: data.email ?? '',
          },
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    await queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
    setIsImporting(false);

    if (successCount) {
      setImportedStudents([]);
      setSkippedRows(0);
    }

    toast({
      title: 'Excel import complete',
      description: `Added ${successCount} student(s).${failCount ? ` Failed: ${failCount}.` : ''}${skippedRows ? ` Skipped while reading: ${skippedRows}.` : ''}`,
      variant: failCount ? 'destructive' : 'default',
    });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation(redirectPath)} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add New Student</h1>
          <p className="text-muted-foreground">Register a new intern in the system.</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-medium">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                Import From Excel
              </div>
              <p className="text-sm text-muted-foreground">
                Accepted columns: full name, email, internship role, start date, end date, total fee, amount paid.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" disabled={isReadingFile || isImporting}>
                <label className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  {isReadingFile ? 'Reading...' : 'Choose File'}
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="sr-only"
                    onChange={handleExcelChange}
                    disabled={isReadingFile || isImporting}
                  />
                </label>
              </Button>
              <Button
                type="button"
                onClick={handleImportStudents}
                disabled={!importedStudents.length || isImporting || createStudent.isPending}
              >
                {isImporting ? 'Importing...' : `Import ${importedStudents.length || ''}`.trim()}
              </Button>
            </div>
          </div>

          {importedStudents.length > 0 && (
            <div className="mt-4 rounded-md border bg-muted/30 p-3 text-sm">
              <div className="font-medium">
                {importedStudents.length} valid row(s) ready{skippedRows ? `, ${skippedRows} row(s) skipped` : ''}
              </div>
              <div className="mt-2 grid gap-1 text-muted-foreground">
                {importedStudents.slice(0, 5).map((student) => (
                  <div key={student.rowNumber}>
                    Row {student.rowNumber}: {student.full_name} - {student.internship_role}
                  </div>
                ))}
                {importedStudents.length > 5 && <div>...and {importedStudents.length - 5} more</div>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-fullname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="internship_role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internship Role</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-role" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="email@example.com" data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select start date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select end date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-full">
                  <h3 className="text-lg font-medium border-b pb-2 mb-4 mt-2">Payment Details</h3>
                </div>

                <FormField
                  control={form.control}
                  name="total_fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Fee (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Enter total fee"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                          data-testid="input-total-fee"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount_paid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount Paid (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Enter amount paid"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                          data-testid="input-amount-paid"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setLocation(redirectPath)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" disabled={createStudent.isPending} data-testid="button-submit">
                  {createStudent.isPending ? 'Saving...' : 'Save Student'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
