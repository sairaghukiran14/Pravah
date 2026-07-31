import { executeSingleNode } from '../lib/execution';
import { SerializedNode } from '../types/pipeline';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('==================================================');
  console.log('🧪 Testing All Processing Nodes Execution Engine');
  console.log('==================================================\n');

  const processingNodeTypes = [
    'stt',
    'translate',
    'tts',
    'ocr',
    'vision',
    'llm',
    'summarize',
    'sentiment',
    'keyword_extraction',
    'classification'
  ];

  const dummyInputText = 'I am extremely happy with this amazing platform! It works flawlessly.';

  let passed = 0;
  let failed = 0;

  for (const type of processingNodeTypes) {
    console.log(`[TEST] Testing processing node: ${type.toUpperCase()}`);
    const node: SerializedNode = {
      id: `mock_${type}_123`,
      type: type as any,
      label: `Test ${type}`,
      positionX: 0,
      positionY: 0,
      config: {
        categories: 'Tech, Support, Feedback, Other'
      }
    };

    try {
      const result = await executeSingleNode(node, [], {}, dummyInputText);
      if (result.status === 'completed') {
        passed++;
        console.log(`   ✅ SUCCESS (${result.durationMs}ms)`);
        console.log(`      Output: ${JSON.stringify(result.output).substring(0, 100)}...`);
      } else {
        failed++;
        console.log(`   ❌ FAILED`);
        console.log(`      Error:`, result.error);
      }
    } catch (e: any) {
      failed++;
      console.log(`   ❌ FAILED with Exception`);
      console.log(`      Exception:`, e.message);
    }
    console.log('');
  }

  console.log('==================================================');
  console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================');
}

main().catch(console.error);
