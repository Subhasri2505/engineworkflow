import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding unique Intelligent Support Workflow...");

  // 1. Create Workflow
  const workflow = await prisma.workflow.create({
    data: {
      name: "Intelligent Support Escalation",
      version: 1,
      is_active: true,
      input_schema: {
        ticket_subject: "string",
        ticket_body: "string",
        customer_tier: "string",
        urgency_score: "number",
      },
    },
  });

  // 2. Create Steps
  const triage = await prisma.step.create({
    data: {
      workflow_id: workflow.id,
      name: "Initial Triage",
      step_type: "task",
      order: 1,
      metadata: { action: "sentiment_analysis" },
    },
  });

  const tier1 = await prisma.step.create({
    data: {
      workflow_id: workflow.id,
      name: "Tier 1 Support",
      step_type: "task",
      order: 2,
    },
  });

  const tier2 = await prisma.step.create({
    data: {
      workflow_id: workflow.id,
      name: "Tier 2 Support",
      step_type: "task",
      order: 3,
    },
  });

  const escalation = await prisma.step.create({
    data: {
      workflow_id: workflow.id,
      name: "Management Approval",
      step_type: "approval",
      order: 4,
      metadata: { role: "manager" },
    },
  });

  const notification = await prisma.step.create({
    data: {
      workflow_id: workflow.id,
      name: "Send Status Update",
      step_type: "notification",
      order: 5,
      metadata: { template: "ticket_received" },
    },
  });

  // 3. Set Start Step
  await prisma.workflow.update({
    where: { id: workflow.id },
    data: { start_step_id: triage.id },
  });

  // 4. Create Rules
  
  // Triage Rules
  await prisma.rule.createMany({
    data: [
      {
        step_id: triage.id,
        condition: "urgency_score > 8",
        next_step_id: escalation.id,
        priority: 1,
      },
      {
        step_id: triage.id,
        condition: 'customer_tier == "Enterprise"',
        next_step_id: tier2.id,
        priority: 2,
      },
      {
        step_id: triage.id,
        condition: 'contains(ticket_body, "refund")',
        next_step_id: tier2.id,
        priority: 3,
      },
      {
        step_id: triage.id,
        condition: "DEFAULT",
        next_step_id: tier1.id,
        priority: 10,
      },
    ],
  });

  // Tier 1 Rules
  await prisma.rule.create({
    data: {
      step_id: tier1.id,
      condition: "DEFAULT",
      next_step_id: notification.id,
    },
  });

  // Tier 2 Rules
  await prisma.rule.create({
    data: {
      step_id: tier2.id,
      condition: "DEFAULT",
      next_step_id: notification.id,
    },
  });

  // Escalation Rules
  await prisma.rule.create({
    data: {
      step_id: escalation.id,
      condition: "DEFAULT",
      next_step_id: notification.id,
    },
  });

  // Notification Rules (End)
  await prisma.rule.create({
    data: {
      step_id: notification.id,
      condition: "DEFAULT",
      next_step_id: null,
    },
  });

  console.log(`✅ Workflow created with ID: ${workflow.id}`);
  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
