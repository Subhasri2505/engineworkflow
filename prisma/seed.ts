import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Create Workflow ────────────────────────────────────────────

  const workflow = await prisma.workflow.create({
    data: {
      name: "Expense Approval",
      version: 1,
      is_active: true,
      input_schema: {
        amount: "number",
        department: "string",
        description: "string",
      },
    },
  });

  console.log(`✅ Created workflow: ${workflow.name} (${workflow.id})`);

  // ── Create Steps ──────────────────────────────────────────────

  const managerApproval = await prisma.step.create({
    data: {
      workflow_id: workflow.id,
      name: "Manager Approval",
      step_type: "approval",
      order: 1,
      metadata: { approver_role: "manager", timeout_hours: 48 },
    },
  });

  const financeNotification = await prisma.step.create({
    data: {
      workflow_id: workflow.id,
      name: "Finance Notification",
      step_type: "notification",
      order: 2,
      metadata: { notify_email: "finance@company.com", channel: "email" },
    },
  });

  const ceoApproval = await prisma.step.create({
    data: {
      workflow_id: workflow.id,
      name: "CEO Approval",
      step_type: "approval",
      order: 3,
      metadata: { approver_role: "ceo", timeout_hours: 72 },
    },
  });

  const taskRejection = await prisma.step.create({
    data: {
      workflow_id: workflow.id,
      name: "Task Rejection",
      step_type: "task",
      order: 4,
      metadata: { action: "reject", notify_requester: true },
    },
  });

  console.log(
    `✅ Created steps: Manager Approval, Finance Notification, CEO Approval, Task Rejection`
  );

  // ── Set start step ────────────────────────────────────────────

  await prisma.workflow.update({
    where: { id: workflow.id },
    data: { start_step_id: managerApproval.id },
  });

  // ── Create Rules ─────────────────────────────────────────────<br>

  // Manager Approval rules:
  // - amount > 10000 → CEO Approval
  // - amount > 1000 → Finance Notification
  // - DEFAULT → Task Rejection
  await prisma.rule.createMany({
    data: [
      {
        step_id: managerApproval.id,
        condition: "amount > 10000",
        next_step_id: ceoApproval.id,
        priority: 0,
      },
      {
        step_id: managerApproval.id,
        condition: "amount > 1000",
        next_step_id: financeNotification.id,
        priority: 1,
      },
      {
        step_id: managerApproval.id,
        condition: "DEFAULT",
        next_step_id: taskRejection.id,
        priority: 10,
      },
    ],
  });

  // Finance Notification rules:
  // - contains(department, "IT") → CEO Approval
  // - DEFAULT → end (null)
  await prisma.rule.createMany({
    data: [
      {
        step_id: financeNotification.id,
        condition: 'contains(department, "IT")',
        next_step_id: ceoApproval.id,
        priority: 0,
      },
      {
        step_id: financeNotification.id,
        condition: "DEFAULT",
        next_step_id: null,
        priority: 99,
      },
    ],
  });

  // CEO Approval rules:
  // - amount >= 50000 → Task Rejection (too high)
  // - DEFAULT → end
  await prisma.rule.createMany({
    data: [
      {
        step_id: ceoApproval.id,
        condition: "amount >= 50000",
        next_step_id: taskRejection.id,
        priority: 0,
      },
      {
        step_id: ceoApproval.id,
        condition: "DEFAULT",
        next_step_id: null,
        priority: 99,
      },
    ],
  });

  console.log("✅ Created rules with sample conditions");
  console.log("\n🎉 Seeding complete!");
  console.log(`\nWorkflow ID: ${workflow.id}`);
  console.log("Steps:");
  console.log(`  Manager Approval    → ${managerApproval.id}`);
  console.log(`  Finance Notification → ${financeNotification.id}`);
  console.log(`  CEO Approval        → ${ceoApproval.id}`);
  console.log(`  Task Rejection      → ${taskRejection.id}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
