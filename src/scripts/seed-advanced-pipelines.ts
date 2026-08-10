import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.log('No users found in database to seed pipelines for.');
    return;
  }

  console.log(`Found ${users.length} user(s) to seed advanced pipelines.`);

  for (const user of users) {
    // Find or create 'Advanced AI Use Cases' project
    let project = await prisma.project.findFirst({
      where: { userId: user.id, name: 'Advanced AI Use Cases' }
    });

    if (!project) {
      project = await prisma.project.create({
        data: {
          userId: user.id,
          name: 'Advanced AI Use Cases',
          description: 'A premium suite of 10 advanced pipelines showcasing logic routing, document QA (RAG), regional script transliteration, API webhooks, and SMS dispatches.',
        }
      });
    } else {
      // Clear out existing pipelines under this project to avoid duplicates on re-runs
      const existingPipelines = await prisma.pipeline.findMany({
        where: { projectId: project.id }
      });
      for (const pipe of existingPipelines) {
        await prisma.pipeline.delete({ where: { id: pipe.id } });
      }
    }

    const templates = [
      {
        name: '1. Code-Mixed Customer Support Alerting & Router',
        description: 'Transcribes customer regional audio reviews, normalizes Hinglish/Tenglish slang, analyzes sentiment, and conditionally dispatches webhook alerts or high-priority SMS alerts.',
        nodes: [
          { type: 'audio_input', label: 'Customer Audio Feedback', x: 50, y: 250, config: { input_type: 'upload' } },
          { type: 'stt', label: 'Saaras Speech-to-Text', x: 250, y: 250, config: { language_code: 'hi-IN', model: 'saaras:v3' } },
          { type: 'codemix_normalizer', label: 'Code-Mix Cleaner', x: 480, y: 250, config: { target_language: 'Hindi' } },
          { type: 'sentiment', label: 'Sentiment Evaluator', x: 700, y: 250, config: {} },
          { type: 'router', label: 'Is Review Negative?', x: 920, y: 250, config: { condition_type: 'contains', condition_value: 'negative' } },
          { type: 'sms_sender', label: 'Urgent Manager SMS Alert', x: 1180, y: 150, config: { recipient_phone: '+919876543210', sms_message: 'Alert! Negative review received from customer: {{codemix_normalizer.text}}' } },
          { type: 'webhook', label: 'Slack Webhook Log', x: 1180, y: 350, config: { webhook_url: 'https://httpbin.org/post', http_method: 'POST' } }
        ],
        edges: [
          { source: 0, target: 1 },
          { source: 1, target: 2 },
          { source: 2, target: 3 },
          { source: 3, target: 4 },
          { source: 4, target: 5, sourceHandle: 'true' },
          { source: 4, target: 6, sourceHandle: 'false' }
        ]
      },
      {
        name: '2. Document QA Bot (Multilingual RAG Engine)',
        description: 'Splits uploaded text chunks, performs simulated vector relevance query lookup, asks the LLM to answer using only retrieved contexts, and translates output into Telugu.',
        nodes: [
          { type: 'document_input', label: 'Manual PDF Upload', x: 50, y: 250, config: { format: 'pdf' } },
          { type: 'pdf_splitter', label: 'Document Chunker', x: 250, y: 250, config: { chunk_size: 600, chunk_overlap: 50 } },
          { type: 'vector_search', label: 'Vector Search Query', x: 480, y: 250, config: { query: 'refund policy summary', fallback_context: 'Company policy chunk 1: Refunds are processed within 7 business days.\n\nCompany policy chunk 2: Support is available 24/7.' } },
          { type: 'llm', label: 'RAG Answer Generator', x: 700, y: 250, config: { prompt: 'Answer the question based only on context: {{vector_search.text}}', temperature: 0.1 } },
          { type: 'translate', label: 'Translate to Telugu', x: 920, y: 250, config: { source_language_code: 'en-IN', target_language_code: 'te-IN' } },
          { type: 'text_output', label: 'Final Telugu QA Answer', x: 1150, y: 250, config: {} }
        ],
        edges: [
          { source: 0, target: 1 },
          { source: 1, target: 2 },
          { source: 2, target: 3 },
          { source: 3, target: 4 },
          { source: 4, target: 5 }
        ]
      },
      {
        name: '3. Regional Debate Podcast & Outbound SMS Dispatch',
        description: 'Generates a 2-speaker podcast debate script on a topic, synthesizes multi-voice WAV files, and dispatches the raw transcript to the producer.',
        nodes: [
          { type: 'text_input', label: 'Podcast Topic', x: 50, y: 250, config: { text: 'Impact of digital payments in rural India' } },
          { type: 'podcast', label: 'Podcast Script & Synthesis', x: 250, y: 250, config: { turns: 4, target_language_code: 'hi-IN', speaker_a: 'aditya', speaker_b: 'ritu' } },
          { type: 'sms_sender', label: 'Send Transcript to SMS', x: 500, y: 150, config: { recipient_phone: '+919999988888', sms_message: 'Your podcast summary: {{podcast.response}}' } },
          { type: 'audio_output', label: 'Listen to Podcast', x: 500, y: 350, config: {} }
        ],
        edges: [
          { source: 0, target: 1 },
          { source: 1, target: 2 },
          { source: 1, target: 3 }
        ]
      },
      {
        name: '4. Phonetic Transliteration Speech Broadcaster',
        description: 'Translates inputs to Tamil, transliterates Tamil letters phonetically into Latin characters so non-native readers can read it, and plays the audio.',
        nodes: [
          { type: 'text_input', label: 'Hindi Message Input', x: 50, y: 250, config: { text: 'आपका दिन मंगलमय हो!' } },
          { type: 'translate', label: 'Translate to Tamil', x: 250, y: 250, config: { source_language_code: 'hi-IN', target_language_code: 'ta-IN' } },
          { type: 'transliteration', label: 'Tamil to Latin phonetic', x: 480, y: 150, config: { source_script: 'Tamil', target_script: 'Latin' } },
          { type: 'tts', label: 'Tamil Audio Synthesis', x: 480, y: 350, config: { target_language_code: 'ta-IN', speaker: 'kavya' } },
          { type: 'text_output', label: 'Phonetic Text Reader', x: 750, y: 150, config: {} },
          { type: 'audio_output', label: 'Listen Audio Stream', x: 750, y: 350, config: {} }
        ],
        edges: [
          { source: 0, target: 1 },
          { source: 1, target: 2 },
          { source: 1, target: 3 },
          { source: 2, target: 4 },
          { source: 3, target: 5 }
        ]
      },
      {
        name: '5. Hinglish Feedback Analyzer & Slack Hook Log',
        description: 'Cleans code-mixed Hinglish inputs, determines sentiment rating, and conditional logs negatives to Slack.',
        nodes: [
          { type: 'audio_input', label: 'Customer Reviews Audio', x: 50, y: 250, config: { input_type: 'upload' } },
          { type: 'stt', label: 'Speech-to-Text Conversion', x: 250, y: 250, config: { language_code: 'hi-IN', model: 'saaras:v3' } },
          { type: 'codemix_normalizer', label: 'Normalise Mixed Hinglish', x: 480, y: 250, config: { target_language: 'Hindi' } },
          { type: 'sentiment', label: 'Sentiment Rating', x: 700, y: 250, config: {} },
          { type: 'router', label: 'Is Customer Dissatisfied?', x: 920, y: 250, config: { condition_type: 'contains', condition_value: 'negative' } },
          { type: 'webhook', label: 'Post to Slack Log', x: 1180, y: 250, config: { webhook_url: 'https://httpbin.org/post', http_method: 'POST' } }
        ],
        edges: [
          { source: 0, target: 1 },
          { source: 1, target: 2 },
          { source: 2, target: 3 },
          { source: 3, target: 4 },
          { source: 4, target: 5, sourceHandle: 'true' }
        ]
      },
      {
        name: '6. Auto-IVR Voice Routing Agent',
        description: 'Simulates telephone IVR: transcribes spoken answers, conditional routes based on keywords, adds a 3s delay, and speaks back confirmation in Telugu.',
        nodes: [
          { type: 'audio_input', label: 'Caller Audio Input', x: 50, y: 250, config: { input_type: 'upload' } },
          { type: 'stt', label: 'Saaras Speech-to-Text', x: 250, y: 250, config: { language_code: 'hi-IN', model: 'saaras:v3' } },
          { type: 'router', label: 'Wants Customer Support?', x: 480, y: 250, config: { condition_type: 'contains', condition_value: 'support' } },
          { type: 'delay', label: 'Pause 3 seconds', x: 700, y: 150, config: { duration: 3 } },
          { type: 'tts', label: 'Speak confirmation', x: 920, y: 150, config: { target_language_code: 'te-IN', speaker: 'ritu' } },
          { type: 'audio_output', label: 'Play Confirmation Audio', x: 1150, y: 150, config: {} }
        ],
        edges: [
          { source: 0, target: 1 },
          { source: 1, target: 2 },
          { source: 2, target: 3, sourceHandle: 'true' },
          { source: 3, target: 4 },
          { source: 4, target: 5 }
        ]
      },
      {
        name: '7. Scanned Invoice OCR, Translation & Webhook Push',
        description: 'Extracts billing texts from scanned invoice invoice images (OCR), translates it to English, extracts total cost, and hits external databases.',
        nodes: [
          { type: 'image_input', label: 'Scanned Invoice Image', x: 50, y: 250, config: {} },
          { type: 'ocr', label: 'Invoice OCR Extract', x: 250, y: 250, config: {} },
          { type: 'translate', label: 'Translate to English', x: 480, y: 250, config: { source_language_code: 'hi-IN', target_language_code: 'en-IN' } },
          { type: 'summarize', label: 'Digest Invoice terms', x: 700, y: 250, config: { length: 'short' } },
          { type: 'webhook', label: 'Webhook database logging', x: 920, y: 250, config: { webhook_url: 'https://httpbin.org/post', http_method: 'POST' } }
        ],
        edges: [
          { source: 0, target: 1 },
          { source: 1, target: 2 },
          { source: 2, target: 3 },
          { source: 3, target: 4 }
        ]
      },
      {
        name: '8. Transliterated Outbound SMS Broadcaster',
        description: 'Takes English message, translates to Hindi, transliterates to Roman text, and texts it to the recipient.',
        nodes: [
          { type: 'text_input', label: 'Alert Message (En)', x: 50, y: 250, config: { text: 'Congratulations on winning your match!' } },
          { type: 'translate', label: 'Translate to Hindi', x: 250, y: 250, config: { source_language_code: 'en-IN', target_language_code: 'hi-IN' } },
          { type: 'transliteration', label: 'Romanized translit', x: 480, y: 250, config: { source_script: 'Devanagari', target_script: 'Latin' } },
          { type: 'sms_sender', label: 'Send Romanized SMS', x: 700, y: 250, config: { recipient_phone: '+919999977777', sms_message: 'Alert: {{transliteration.text}}' } }
        ],
        edges: [
          { source: 0, target: 1 },
          { source: 1, target: 2 },
          { source: 2, target: 3 }
        ]
      },
      {
        name: '9. Mixed-Speech Podcast Summariser Workflow',
        description: 'Cleans up raw code-mixed text reviews, structures a formal argument debate, and plays it back to managers.',
        nodes: [
          { type: 'text_input', label: 'Hinglish Feed Review', x: 50, y: 250, config: { text: 'delivery speed fast thha but packing kharab thhi' } },
          { type: 'codemix_normalizer', label: 'Hinglish to English Cleaner', x: 250, y: 250, config: { target_language: 'English' } },
          { type: 'podcast', label: 'Podcast Summarizer debate', x: 480, y: 250, config: { turns: 4, target_language_code: 'en-IN', speaker_a: 'rohan', speaker_b: 'neha' } },
          { type: 'audio_output', label: 'Listen to Podcast', x: 720, y: 250, config: {} }
        ],
        edges: [
          { source: 0, target: 1 },
          { source: 1, target: 2 },
          { source: 2, target: 3 }
        ]
      },
      {
        name: '10. RAG Document-Search Audio Guide Generator',
        description: 'Queries reference documents for travel summaries, translates query answers to Hindi, synthesizes Hindi audio, and plays guide.',
        nodes: [
          { type: 'text_input', label: 'Guide Question', x: 50, y: 250, config: { text: 'Taj Mahal entry guidelines' } },
          { type: 'vector_search', label: 'Query vector context', x: 250, y: 250, config: { query: 'Taj Mahal rules', fallback_context: 'Guideline 1: Taj Mahal opens 30 minutes before sunrise.\n\nGuideline 2: Cameras are allowed inside the complex.' } },
          { type: 'llm', label: 'LLM Guide writer', x: 480, y: 250, config: { prompt: 'Write an audio guide answer using context: {{vector_search.text}}', temperature: 0.2 } },
          { type: 'translate', label: 'Translate to Hindi', x: 700, y: 250, config: { source_language_code: 'en-IN', target_language_code: 'hi-IN' } },
          { type: 'tts', label: 'Hindi voice Synthesis', x: 920, y: 250, config: { target_language_code: 'hi-IN', speaker: 'aditya' } },
          { type: 'audio_output', label: 'Play Audio Guide', x: 1150, y: 250, config: {} }
        ],
        edges: [
          { source: 0, target: 1 },
          { source: 1, target: 2 },
          { source: 2, target: 3 },
          { source: 3, target: 4 },
          { source: 4, target: 5 }
        ]
      }
    ];

    for (const template of templates) {
      const pipelineId = crypto.randomUUID();
      
      await prisma.pipeline.create({
        data: {
          id: pipelineId,
          projectId: project.id,
          name: template.name,
          description: template.description,
        }
      });

      const nodeUUIDs: Record<number, string> = {};
      const nodeCreates = template.nodes.map((n, index) => {
        const nodeId = crypto.randomUUID();
        nodeUUIDs[index] = nodeId;
        return {
          id: nodeId,
          pipelineId: pipelineId,
          type: n.type,
          label: n.label,
          positionX: n.x,
          positionY: n.y,
          config: n.config,
        };
      });

      await prisma.pipelineNode.createMany({ data: nodeCreates });

      const edgeCreates = template.edges.map((e: any) => ({
        id: crypto.randomUUID(),
        pipelineId: pipelineId,
        source: nodeUUIDs[e.source],
        target: nodeUUIDs[e.target],
        sourceHandle: e.sourceHandle || 'output',
        targetHandle: 'input'
      }));

      await prisma.pipelineEdge.createMany({ data: edgeCreates });
    }

    console.log(`Seeded project 'Advanced AI Use Cases' with 10 templates for user ${user.email}`);
  }

  console.log('Finished seeding all advanced pipelines successfully!');
}

main()
  .catch((err) => {
    console.error('Error during seeding:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
