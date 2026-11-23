import { NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import { apiHandler, AppError } from "@/server/api";
import { requireUser } from "@/server/auth";
import { createVoucher } from "@/server/accounting";
import { getToday } from "@/server/settings";

const r2 = (n: number) => Math.round(Number(n || 0) * 100) / 100;

export const GET = apiHandler(async () => {
  await requireUser();

  const employeeList = await db.select().from(S.employees).orderBy(asc(S.employees.id));

  const payrollHistory = await db
    .select({
      id: S.payrollRecords.id,
      month: S.payrollRecords.month,
      employeeId: S.payrollRecords.employeeId,
      employeeName: S.employees.name,
      designation: S.employees.designation,
      department: S.employees.department,
      basicSalary: S.payrollRecords.basicSalary,
      allowances: S.payrollRecords.allowances,
      deductions: S.payrollRecords.deductions,
      netSalary: S.payrollRecords.netSalary,
      paymentDate: S.payrollRecords.paymentDate,
      paymentMethod: S.payrollRecords.paymentMethod,
      voucherId: S.payrollRecords.voucherId,
      status: S.payrollRecords.status,
    })
    .from(S.payrollRecords)
    .innerJoin(S.employees, eq(S.employees.id, S.payrollRecords.employeeId))
    .orderBy(desc(S.payrollRecords.month), desc(S.payrollRecords.id))
    .limit(500);

  const totalMonthlyPayroll = employeeList
    .filter((e) => e.status === "active")
    .reduce((s, e) => s + Number(e.netSalary || 0), 0);

  return NextResponse.json({
    employees: employeeList,
    history: payrollHistory,
    totalMonthlyPayroll: r2(totalMonthlyPayroll),
  });
});

export const POST = apiHandler(async (req: Request) => {
  const user = await requireUser();
  const body = await req.json();
  const today = await getToday();

  // Run Monthly Payroll Batch
  if (body.action === "run_payroll") {
    const month = body.month?.trim(); // YYYY-MM
    if (!month || !/^\d{4}-\d{2}$/.test(month)) throw new AppError(400, "Valid payroll month (YYYY-MM) is required");

    const activeEmployees = await db.select().from(S.employees).where(eq(S.employees.status, "active"));
    if (activeEmployees.length === 0) throw new AppError(400, "No active employees found to process payroll");

    // Check if payroll already processed for this month
    const existing = await db.select().from(S.payrollRecords).where(eq(S.payrollRecords.month, month)).limit(1);
    if (existing.length > 0) throw new AppError(400, `Payroll for month ${month} has already been processed`);

    let totalPayroll = 0;
    const recordsToInsert = activeEmployees.map((emp) => {
      const basic = Number(emp.basicSalary || 0);
      const allowances = Number(emp.houseRent || 0) + Number(emp.medicalAllowance || 0) + Number(emp.conveyance || 0) + Number(emp.otherAllowances || 0);
      const deductions = Number(emp.deductions || 0);
      const net = r2(basic + allowances - deductions);
      totalPayroll += net;

      return {
        month,
        employeeId: emp.id,
        basicSalary: basic,
        allowances,
        deductions,
        netSalary: net,
        paymentDate: body.paymentDate || today,
        paymentMethod: body.paymentMethod || "bank",
        status: "paid",
      };
    });

    totalPayroll = r2(totalPayroll);

    // Create journal voucher for payroll expense:
    // Dr Salaries & Allowances: totalPayroll
    // Cr City Bank A/C: totalPayroll
    const lines = [
      {
        accountCode: "5020",
        accountName: "Employee Salaries & Allowances",
        description: `Staff Salaries & Allowances for ${month} (${activeEmployees.length} employees)`,
        debit: totalPayroll,
        credit: 0,
      },
      {
        accountCode: "1012",
        accountName: "City Bank A/C #1102938475",
        description: `Salaries disbursement for ${month}`,
        debit: 0,
        credit: totalPayroll,
      },
    ];

    const voucher = await createVoucher({
      voucherType: "payment",
      date: body.paymentDate || today,
      reference: `SALARY-${month}`,
      description: `Payroll disbursement for ${month}`,
      lines,
      status: "posted",
      userId: user.id,
    });

    // Insert records
    for (const rec of recordsToInsert) {
      await db.insert(S.payrollRecords).values({
        ...rec,
        voucherId: voucher.id,
      });
    }

    return NextResponse.json({ ok: true, count: recordsToInsert.length, totalPayroll, voucher });
  }

  // Create or update employee
  if (!body.name?.trim()) throw new AppError(400, "Employee Name is required");

  const basic = Number(body.basicSalary || 0);
  const house = Number(body.houseRent || 0);
  const med = Number(body.medicalAllowance || 0);
  const conv = Number(body.conveyance || 0);
  const other = Number(body.otherAllowances || 0);
  const ded = Number(body.deductions || 0);
  const net = r2(basic + house + med + conv + other - ded);

  const [emp] = await db
    .insert(S.employees)
    .values({
      employeeCode: body.employeeCode?.trim() || `EMP-${Date.now().toString().slice(-4)}`,
      name: body.name.trim(),
      designation: body.designation?.trim() || null,
      department: body.department?.trim() || "General",
      basicSalary: basic,
      houseRent: house,
      medicalAllowance: med,
      conveyance: conv,
      otherAllowances: other,
      deductions: ded,
      netSalary: net,
      bankAccount: body.bankAccount?.trim() || null,
      bankName: body.bankName?.trim() || null,
      status: "active",
      joinedDate: body.joinedDate || today,
    })
    .returning();

  return NextResponse.json({ ok: true, employee: emp });
});
