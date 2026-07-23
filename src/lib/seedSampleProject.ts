import prisma from '@/lib/prisma';

export async function seedSampleProject(userId: string) {
  try {
    const existing = await prisma.project.findFirst({
      where: { userId, name: 'Sample Project' }
    });

    if (existing) return;

    const project = await prisma.project.create({
      data: {
        userId,
        name: 'Sample Project',
        description: 'Explore pre-built pipelines showcasing functional audio, translation, and transcription capabilities using Sarvam AI.',
      }
    });

    const pipelineTemplates = [
      {
        name: '1. Voice-to-Voice Translation',
        description: 'Translates spoken audio into another language and synthesizes it back to speech.',
        nodes: [
          { type: 'audio_input', label: 'Audio Upload', x: 100, y: 150, config: { input_type: 'upload' } },
          { type: 'stt', label: 'Speech-to-Text', x: 350, y: 150, config: { language_code: 'hi-IN', model: 'saaras:v3' } },
          { type: 'translate', label: 'Translate (Hi->Te)', x: 600, y: 150, config: { source_language_code: 'hi-IN', target_language_code: 'te-IN' } },
          { type: 'tts', label: 'Text-to-Speech (Te)', x: 850, y: 150, config: { target_language_code: 'te-IN', speaker: 'ritu' } },
          { type: 'audio_output', label: 'Audio Out', x: 1100, y: 150, config: {} }
        ],
        edges: [
          { source: 0, target: 1 },
          { source: 1, target: 2 },
          { source: 2, target: 3 },
          { source: 3, target: 4 },
        ]
      },
      {
        name: '2. Multilingual Text-to-Speech',
        description: 'Takes text input, translates it, and synthesizes it to speech.',
        nodes: [
          { type: 'text_input', label: 'Text Input', x: 100, y: 150, config: {} },
          { type: 'translate', label: 'Translate (En->Hi)', x: 350, y: 150, config: { source_language_code: 'en-IN', target_language_code: 'hi-IN' } },
          { type: 'tts', label: 'Text-to-Speech (Hi)', x: 600, y: 150, config: { target_language_code: 'hi-IN', speaker: 'aditya' } },
          { type: 'audio_output', label: 'Audio Out', x: 850, y: 150, config: {} }
        ],
        edges: [
          { source: 0, target: 1 },
          { source: 1, target: 2 },
          { source: 2, target: 3 },
        ]
      },
      {
        name: '3. Audio Transcription Pipeline',
        description: 'Transcribes uploaded audio into text.',
        nodes: [
          { type: 'audio_input', label: 'Audio Upload', x: 100, y: 150, config: { input_type: 'upload' } },
          { type: 'stt', label: 'Speech-to-Text', x: 350, y: 150, config: { language_code: 'hi-IN', model: 'saaras:v3' } },
          { type: 'text_output', label: 'Transcript', x: 600, y: 150, config: {} }
        ],
        edges: [
          { source: 0, target: 1 },
          { source: 1, target: 2 },
        ]
      },
      {
        name: '4. Text Translation Pipeline',
        description: 'Translates text between regional languages.',
        nodes: [
          { type: 'text_input', label: 'Source Text', x: 100, y: 150, config: {} },
          { type: 'translate', label: 'Translate', x: 350, y: 150, config: { source_language_code: 'hi-IN', target_language_code: 'ta-IN' } },
          { type: 'text_output', label: 'Translated Result', x: 600, y: 150, config: {} }
        ],
        edges: [
          { source: 0, target: 1 },
          { source: 1, target: 2 },
        ]
      },
      {
        name: '5. Dual Audio Broadcast (Branched)',
        description: 'Synthesizes text into both Hindi and Telugu concurrently.',
        nodes: [
          { type: 'text_input', label: 'English Input', x: 100, y: 250, config: {} },
          { type: 'translate', label: 'Translate to Hindi', x: 400, y: 150, config: { source_language_code: 'en-IN', target_language_code: 'hi-IN' } },
          { type: 'translate', label: 'Translate to Telugu', x: 400, y: 350, config: { source_language_code: 'en-IN', target_language_code: 'te-IN' } },
          { type: 'tts', label: 'Hindi Audio', x: 700, y: 150, config: { target_language_code: 'hi-IN', speaker: 'aditya' } },
          { type: 'tts', label: 'Telugu Audio', x: 700, y: 350, config: { target_language_code: 'te-IN', speaker: 'ritu' } },
          { type: 'audio_output', label: 'Hindi Out', x: 1000, y: 150, config: {} },
          { type: 'audio_output', label: 'Telugu Out', x: 1000, y: 350, config: {} },
        ],
        edges: [
          { source: 0, target: 1 }, // text -> hi translate
          { source: 0, target: 2 }, // text -> te translate
          { source: 1, target: 3 }, // hi translate -> hi tts
          { source: 2, target: 4 }, // te translate -> te tts
          { source: 3, target: 5 }, // hi tts -> hi out
          { source: 4, target: 6 }, // te tts -> te out
        ]
      },
      {
        name: '6. Advanced Indic Language & LLM Workspace (Complex)',
        description: 'Multi-branched workflow translating input audio, extracting metadata, analyzing sentiment, and summarizing output to speech.',
        nodes: [
          { type: 'audio_input', label: 'Hindi Audio Upload', x: 50, y: 300, config: { input_type: 'upload' } },
          { type: 'stt', label: 'Hindi Speech-to-Text', x: 250, y: 300, config: { language_code: 'hi-IN', model: 'saaras:v3' } },
          { type: 'translate', label: 'Translate (Hi->En)', x: 450, y: 300, config: { source_language_code: 'hi-IN', target_language_code: 'en-IN' } },
          { type: 'sentiment', label: 'Sentiment Classifier', x: 700, y: 100, config: { format: 'text' } },
          { type: 'summarize', label: 'Summary Generator', x: 700, y: 250, config: { length: 'short' } },
          { type: 'keyword_extraction', label: 'Keywords Extractor', x: 700, y: 400, config: { max_keywords: 5 } },
          { type: 'classification', label: 'Category Classifier', x: 700, y: 550, config: { categories: 'News, Tech, Support, Feedback' } },
          { type: 'translate', label: 'Translate Summary (En->Te)', x: 950, y: 250, config: { source_language_code: 'en-IN', target_language_code: 'te-IN' } },
          { type: 'tts', label: 'Telugu Audio Synthesis', x: 1200, y: 250, config: { target_language_code: 'te-IN', speaker: 'ritu' } },
          { type: 'audio_output', label: 'Telugu Summary Audio', x: 1450, y: 250, config: {} },
          { type: 'text_output', label: 'English Summary Text', x: 950, y: 150, config: {} },
          { type: 'text_output', label: 'Sentiment Output', x: 950, y: 50, config: {} },
          { type: 'text_output', label: 'Extracted Keywords', x: 950, y: 400, config: {} },
          { type: 'text_output', label: 'Classification Tag', x: 950, y: 550, config: {} }
        ],
        edges: [
          { source: 0, target: 1 },
          { source: 1, target: 2 },
          { source: 2, target: 3 },
          { source: 2, target: 4 },
          { source: 2, target: 5 },
          { source: 2, target: 6 },
          { source: 4, target: 10 },
          { source: 4, target: 7 },
          { source: 7, target: 8 },
          { source: 8, target: 9 },
          { source: 3, target: 11 },
          { source: 5, target: 12 },
          { source: 6, target: 13 }
        ]
      }
    ];

    for (const template of pipelineTemplates) {
      const pipelineId = crypto.randomUUID();
      
      const createdPipeline = await prisma.pipeline.create({
        data: {
          id: pipelineId,
          projectId: project.id,
          name: template.name,
          description: template.description,
        }
      });

      const nodeIds: string[] = [];
      const nodeCreates = template.nodes.map((n) => {
        const nodeId = crypto.randomUUID();
        nodeIds.push(nodeId);
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

      const edgeCreates = template.edges.map(e => ({
        id: crypto.randomUUID(),
        pipelineId: pipelineId,
        source: nodeIds[e.source],
        target: nodeIds[e.target],
        sourceHandle: 'output',
        targetHandle: 'input'
      }));

      await prisma.pipelineEdge.createMany({ data: edgeCreates });
    }

    console.log(`Successfully seeded Sample Project with functional pipelines for user ${userId}`);
  } catch (error) {
    console.error('Failed to seed sample project:', error);
  }
}
