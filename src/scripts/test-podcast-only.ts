import { executeSingleNode } from '../lib/execution';
import { SerializedNode } from '../types/pipeline';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('Testing Podcast Node:');
  const node: SerializedNode = {
    id: 'mock_podcast_test',
    type: 'podcast',
    label: 'Podcast Generator Test',
    positionX: 0,
    positionY: 0,
    config: {
      speaker_a: 'aditya',
      speaker_b: 'ritu',
      target_language_code: 'hi-IN',
      turns: 4
    }
  };

  const result = await executeSingleNode(node, [], {}, 'Artificial Intelligence: Boon or Bane');
  console.log('Result Status:', result.status);
  console.log('Result Error:', result.error);
  console.log('Result Output:', JSON.stringify(result.output, null, 2));
}

main().catch(console.error);
