import prisma from '../src/lib/prisma';
import { executeSingleNode, sortNodesTopologically } from '../src/lib/execution';
import { nodeCost } from '../src/lib/api/pricing';
import type { SerializedNode, SerializedEdge } from '../src/types/pipeline';

async function main() {
  console.log('🧪 Starting Deep End-to-End Trace Engine Verification...\n');

  // 1. Ensure or find a test user
  let testUser = await prisma.user.findFirst({ where: { email: 'trace-test@pravah.dev' } });
  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        email: 'trace-test@pravah.dev',
        name: 'Deep Trace Tester',
        credits: 50.0,
      },
    });
    console.log('✅ Created test user:', testUser.id);
  } else {
    console.log('ℹ️ Found existing test user:', testUser.id);
  }

  // 2. Create test project & pipeline
  const testProject = await prisma.project.create({
    data: {
      userId: testUser.id,
      name: 'Trace Deep Test Project',
      description: 'Automated test project for verifying per-node telemetry',
    },
  });
  console.log('✅ Created test project:', testProject.id);

  const testPipeline = await prisma.pipeline.create({
    data: {
      projectId: testProject.id,
      name: 'Full Telemetry Pipeline (STT -> Translate -> LLM -> TTS)',
      description: 'Multi-node pipeline with voice, translation, and generative reasoning',
    },
  });
  console.log('✅ Created test pipeline:', testPipeline.id);

  // 3. Define 4 serialized nodes: Text Input -> Translate -> LLM -> Text Output
  const nodes: SerializedNode[] = [
    {
      id: 'input_prompt',
      type: 'text_input',
      label: 'Source Hindi Text',
      positionX: 0,
      positionY: 0,
      config: { text: 'नमस्ते! भारत की कृत्रिम बुद्धिमत्ता सर्वम एआई का प्रदर्शन।' },
    },
    {
      id: 'translate_en',
      type: 'translate',
      label: 'Translate to English',
      positionX: 200,
      positionY: 0,
      config: { source_language_code: 'hi-IN', target_language_code: 'en-IN', mode: 'formal' },
    },
    {
      id: 'llm_reasoning',
      type: 'llm',
      label: 'Sarvam LLM Reasoner',
      positionX: 400,
      positionY: 0,
      config: { model: 'sarvam-105b', system_prompt: 'Summarize the input in 5 words.' },
    },
    {
      id: 'output_display',
      type: 'text_output',
      label: 'Final Summary Output',
      positionX: 600,
      positionY: 0,
      config: {},
    },
  ];

  const edges: SerializedEdge[] = [
    { id: 'e1', source: 'input_prompt', target: 'translate_en' },
    { id: 'e2', source: 'translate_en', target: 'llm_reasoning' },
    { id: 'e3', source: 'llm_reasoning', target: 'output_display' },
  ];

  // 4. Save nodes & edges in DB
  await prisma.pipelineNode.createMany({
    data: nodes.map((n) => ({
      id: n.id,
      pipelineId: testPipeline.id,
      type: n.type,
      label: n.label,
      positionX: n.positionX,
      positionY: n.positionY,
      config: n.config,
    })),
  });

  await prisma.pipelineEdge.createMany({
    data: edges.map((e) => ({
      id: e.id,
      pipelineId: testPipeline.id,
      source: e.source,
      target: e.target,
    })),
  });
  console.log('✅ Created 4 pipeline nodes and 3 edges');

  // 5. Create a PipelineRun record
  const pipelineRun = await prisma.pipelineRun.create({
    data: {
      pipelineId: testPipeline.id,
      status: 'running',
      input: { text: nodes[0].config.text },
      reservedCredits: 5.0,
      nodeRuns: {
        create: nodes.map((n) => ({
          nodeId: n.id,
          nodeType: n.type,
          status: 'pending',
        })),
      },
    },
    include: { nodeRuns: true },
  });
  console.log('✅ Created PipelineRun:', pipelineRun.id, 'with 4 pending NodeRuns');

  // 6. Execute each node sequentially simulating server execution loop
  const sortedNodes = sortNodesTopologically(nodes, edges);
  const nodeOutputs: Record<string, any> = {};
  let totalCost = 0;
  const costBreakdown: Record<string, number> = {};

  for (const node of sortedNodes) {
    const liveIncoming = edges.filter((e) => e.target === node.id);
    const result = await executeSingleNode(node, liveIncoming, nodeOutputs, nodes[0].config.text);
    
    nodeOutputs[node.id] = result.output;
    const spent = nodeCost(node.type, result.input, { config: node.config, usage: result.usage });
    totalCost += spent;
    costBreakdown[node.type] = (costBreakdown[node.type] ?? 0) + spent;

    // Update NodeRun record in DB
    await prisma.nodeRun.updateMany({
      where: { runId: pipelineRun.id, nodeId: node.id },
      data: {
        status: result.status,
        input: result.input,
        output: result.output,
        durationMs: result.durationMs,
        retryCount: result.retryCount ?? 0,
        cost: spent,
        tokenUsage: (result.tokenUsage as any) ?? undefined,
        finishedAt: new Date(),
      },
    });

    console.log(`  🔹 Node ${node.id} (${node.type}): status=${result.status}, duration=${result.durationMs}ms, cost=₹${spent.toFixed(3)}, tokens=`, result.tokenUsage);
  }

  // 7. Complete PipelineRun
  await prisma.pipelineRun.update({
    where: { id: pipelineRun.id },
    data: {
      status: 'completed',
      finishedAt: new Date(),
      costBreakdown,
    },
  });
  console.log(`✅ Completed PipelineRun: totalCost=₹${totalCost.toFixed(3)}\n`);

  // 8. Deep Verification Queries & Assertions
  console.log('🔍 Running Trace Telemetry Assertions...');

  const verifiedRun = await prisma.pipelineRun.findUnique({
    where: { id: pipelineRun.id },
    include: {
      nodeRuns: true,
      pipeline: {
        include: { nodes: true, edges: true },
      },
    },
  });

  if (!verifiedRun) throw new Error('Failed to find verified run');

  console.log(`  ✓ Run status: ${verifiedRun.status} (expected 'completed')`);
  if (verifiedRun.status !== 'completed') throw new Error('Status mismatch');

  console.log(`  ✓ NodeRuns count: ${verifiedRun.nodeRuns.length} (expected 4)`);
  if (verifiedRun.nodeRuns.length !== 4) throw new Error('NodeRuns count mismatch');

  for (const nr of verifiedRun.nodeRuns) {
    console.log(`  ✓ Checking span [${nr.nodeId}] (${nr.nodeType}):`);
    
    // Check durationMs
    if (typeof nr.durationMs !== 'number' || nr.durationMs < 0) {
      throw new Error(`Invalid durationMs on ${nr.nodeId}: ${nr.durationMs}`);
    }
    console.log(`    - durationMs: ${nr.durationMs}ms`);

    // Check retryCount
    if (typeof nr.retryCount !== 'number') {
      throw new Error(`Invalid retryCount on ${nr.nodeId}`);
    }
    console.log(`    - retryCount: ${nr.retryCount}`);

    // Check cost
    if (typeof nr.cost !== 'number' || nr.cost < 0) {
      throw new Error(`Invalid cost on ${nr.nodeId}: ${nr.cost}`);
    }
    console.log(`    - cost: ₹${nr.cost.toFixed(4)}`);

    // Check tokenUsage
    if (!nr.tokenUsage || typeof nr.tokenUsage !== 'object') {
      throw new Error(`Invalid tokenUsage on ${nr.nodeId}`);
    }
    console.log(`    - tokenUsage:`, JSON.stringify(nr.tokenUsage));

    // Check Input snapshot
    if (!nr.input) {
      throw new Error(`Missing input snapshot on ${nr.nodeId}`);
    }
    console.log(`    - input snapshot present`);

    // Check Output snapshot
    if (!nr.output) {
      throw new Error(`Missing output snapshot on ${nr.nodeId}`);
    }
    console.log(`    - output snapshot present`);
  }

  // 9. Cleanup test records
  await prisma.project.delete({ where: { id: testProject.id } });
  console.log('\n🧹 Cleaned up temporary test project and runs.');

  console.log('\n🎉 ALL DEEP TRACE ENGINE TESTS PASSED SUCCESSFULLY!');
}

main()
  .catch((e) => {
    console.error('❌ Deep Trace Test Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
