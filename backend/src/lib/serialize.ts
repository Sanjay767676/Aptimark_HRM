type StudentRow = {
  id: string;
  fullName: string;
  email?: string | null;
  internshipRole: string;
  startDate: string;
  endDate: string;
  createdBy?: string | null;
  createdAt: Date | string;
};

type PaymentRow = {
  id: string;
  studentId: string;
  totalFee: string;
  amountPaid: string;
  balanceAmount: string;
  paymentStatus: string;
  updatedAt: Date | string;
};

type OfferLetterRow = {
  id: string;
  studentId: string;
  generatedAt: Date | string;
  fileUrl: string | null;
  status: string;
  referenceNumber?: string | null;
  sequenceNumber?: number | null;
};

type CertificateRow = {
  id: string;
  studentId: string;
  generatedAt: Date | string;
  fileUrl: string | null;
  status: string;
};

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

export function serializeStudent(student: StudentRow) {
  return {
    id: student.id,
    full_name: student.fullName,
    email: student.email ?? null,
    internship_role: student.internshipRole,
    start_date: student.startDate,
    end_date: student.endDate,
    created_by: student.createdBy ?? null,
    created_at: toIso(student.createdAt),
  };
}

export function serializePayment(payment: PaymentRow) {
  return {
    id: payment.id,
    student_id: payment.studentId,
    total_fee: payment.totalFee,
    amount_paid: payment.amountPaid,
    balance_amount: payment.balanceAmount,
    payment_status: payment.paymentStatus,
    updated_at: toIso(payment.updatedAt),
  };
}

export function serializeOfferLetter(letter: OfferLetterRow, student: StudentRow | null = null) {
  return {
    id: letter.id,
    student_id: letter.studentId,
    generated_at: toIso(letter.generatedAt),
    created_at: toIso(letter.generatedAt),
    file_url: letter.fileUrl,
    status: letter.status,
    email_status: (letter as any).emailStatus ?? null,
    reference_number: letter.referenceNumber ?? null,
    sequence_number: letter.sequenceNumber ?? null,
    student: student ? serializeStudent(student) : null,
  };
}

export function serializeCertificate(cert: CertificateRow, student: StudentRow | null = null) {
  return {
    id: cert.id,
    student_id: cert.studentId,
    generated_at: toIso(cert.generatedAt),
    created_at: toIso(cert.generatedAt),
    file_url: cert.fileUrl,
    status: cert.status,
    email_status: (cert as any).emailStatus ?? null,
    student: student ? serializeStudent(student) : null,
  };
}

export function parseStudentInput(body: Record<string, unknown>) {
  const fullName = String(body.full_name ?? body.fullName ?? "").trim();
  const internshipRole = String(body.internship_role ?? body.internshipRole ?? "").trim();
  const startDate = String(body.start_date ?? body.startDate ?? "").trim();
  const endDate = String(body.end_date ?? body.endDate ?? "").trim();
  const email = body.email !== undefined && body.email !== null ? String(body.email).trim() : null;

  return {
    fullName,
    email: email !== "" ? email : null,
    internshipRole,
    startDate,
    endDate,
  };
}

export function parseStudentUpdate(body: Record<string, unknown>) {
  const update: Partial<{
    fullName: string;
    email: string | null;
    internshipRole: string;
    startDate: string;
    endDate: string;
  }> = {};

  if (body.full_name !== undefined || body.fullName !== undefined) {
    update.fullName = String(body.full_name ?? body.fullName).trim();
  }
  if (body.email !== undefined) {
    update.email = body.email !== null && String(body.email).trim() !== "" ? String(body.email).trim() : null;
  }
  if (body.internship_role !== undefined || body.internshipRole !== undefined) {
    update.internshipRole = String(body.internship_role ?? body.internshipRole).trim();
  }
  if (body.start_date !== undefined || body.startDate !== undefined) {
    update.startDate = String(body.start_date ?? body.startDate).trim();
  }
  if (body.end_date !== undefined || body.endDate !== undefined) {
    update.endDate = String(body.end_date ?? body.endDate).trim();
  }

  return update;
}
