/**
 * Canonical pipeline library shipped to every account.
 *
 * Each new user receives their own editable copy of these on signup (see
 * seedLibrary), and the dashboard surfaces them under "Quick Access".
 *
 * Generated from the reference Library so the shapes match what was built and
 * tested in the editor. Edit here — this is the source of truth; the previous
 * approach of running one-off scripts per account is what left different users
 * with different libraries.
 */

export interface LibraryNodeTemplate {
  type: string;
  label: string;
  x: number;
  y: number;
  config: Record<string, any>;
}

export interface LibraryEdgeTemplate {
  /** Index into the pipeline's nodes array. */
  source: number;
  target: number;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface LibraryPipelineTemplate {
  name: string;
  description: string;
  nodes: LibraryNodeTemplate[];
  edges: LibraryEdgeTemplate[];
}

export const LIBRARY_PIPELINES: LibraryPipelineTemplate[] = [
  {
    "name": "1. Audio Transcription Pipeline",
    "description": "Transcribes uploaded audio into text.",
    "nodes": [
      {
        "type": "audio_input",
        "label": "Audio Upload",
        "x": 100,
        "y": 150,
        "config": {
          "input_type": "upload"
        }
      },
      {
        "type": "stt",
        "label": "Speech-to-Text",
        "x": 350,
        "y": 150,
        "config": {
          "model": "saaras:v3",
          "language_code": "hi-IN"
        }
      },
      {
        "type": "text_output",
        "label": "Transcript",
        "x": 600,
        "y": 150,
        "config": {}
      }
    ],
    "edges": [
      {
        "source": 0,
        "target": 1,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 1,
        "target": 2,
        "sourceHandle": "output",
        "targetHandle": "input"
      }
    ]
  },
  {
    "name": "1. Code-Mixed Customer Support Alerting & Router",
    "description": "Transcribes customer regional audio reviews, normalizes Hinglish/Tenglish slang, analyzes sentiment, and conditionally dispatches webhook alerts or high-priority SMS alerts.",
    "nodes": [
      {
        "type": "audio_input",
        "label": "Customer Audio Feedback",
        "x": 50,
        "y": 250,
        "config": {
          "input_type": "upload"
        }
      },
      {
        "type": "stt",
        "label": "Saaras Speech-to-Text",
        "x": 250,
        "y": 250,
        "config": {
          "model": "saaras:v3",
          "language_code": "hi-IN"
        }
      },
      {
        "type": "codemix_normalizer",
        "label": "Code-Mix Cleaner",
        "x": 480,
        "y": 250,
        "config": {
          "target_language": "Hindi"
        }
      },
      {
        "type": "sentiment",
        "label": "Sentiment Evaluator",
        "x": 700,
        "y": 250,
        "config": {}
      },
      {
        "type": "router",
        "label": "Is Review Negative?",
        "x": 920,
        "y": 250,
        "config": {
          "condition_type": "contains",
          "condition_value": "negative"
        }
      },
      {
        "type": "webhook",
        "label": "Slack Webhook Log",
        "x": 1180,
        "y": 350,
        "config": {
          "http_method": "POST",
          "webhook_url": "https://httpbin.org/post"
        }
      }
    ],
    "edges": [
      {
        "source": 0,
        "target": 1,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 1,
        "target": 2,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 2,
        "target": 3,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 3,
        "target": 4,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 4,
        "target": 5,
        "sourceHandle": "false",
        "targetHandle": "input"
      }
    ]
  },
  {
    "name": "2. Document QA Bot (Multilingual RAG Engine)",
    "description": "Digitises an uploaded document with Sarvam Document AI, splits it into overlapping chunks, retrieves the passages matching your query, answers from those passages only, and translates the answer into Telugu.",
    "nodes": [
      {
        "type": "document_input",
        "label": "Manual PDF Upload",
        "x": 50,
        "y": 250,
        "config": {
          "format": "pdf"
        }
      },
      {
        "type": "vision",
        "label": "Digitise Document",
        "x": 150,
        "y": 30,
        "config": {
          "language": "hi-IN",
          "prompt": "Return the full text of this document exactly as written, preserving headings, tables and paragraph order. Do not summarise, omit or add anything."
        }
      },
      {
        "type": "pdf_splitter",
        "label": "Document Chunker",
        "x": 255,
        "y": 30,
        "config": {
          "chunk_size": 600,
          "chunk_overlap": 50
        }
      },
      {
        "type": "vector_search",
        "label": "Retrieve Passages",
        "x": 405,
        "y": 360,
        "config": {
          "query": "refund policy summary",
          "fallback_context": "Company policy chunk 1: Refunds are processed within 7 business days.\n\nCompany policy chunk 2: Support is available 24/7."
        }
      },
      {
        "type": "llm",
        "label": "RAG Answer Generator",
        "x": 645,
        "y": 15,
        "config": {
          "system_prompt": "You answer strictly from the retrieved passages provided to you. If the passages do not contain the answer, say so plainly rather than drawing on outside knowledge.",
          "prompt": "Using only the retrieved passages below, answer: what is the refund policy?",
          "temperature": 0.1
        }
      },
      {
        "type": "translate",
        "label": "Translate to Telugu",
        "x": 855,
        "y": 360,
        "config": {
          "source_language_code": "en-IN",
          "target_language_code": "te-IN"
        }
      },
      {
        "type": "text_output",
        "label": "Final Telugu QA Answer",
        "x": 1150,
        "y": 250,
        "config": {}
      }
    ],
    "edges": [
      {
        "source": 0,
        "target": 1,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 1,
        "target": 2,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 2,
        "target": 3,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 3,
        "target": 4,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 4,
        "target": 5,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 5,
        "target": 6,
        "sourceHandle": "output",
        "targetHandle": "input"
      }
    ]
  },
  {
    "name": "2. Text Translation Pipeline",
    "description": "Translates text between regional languages.",
    "nodes": [
      {
        "type": "text_input",
        "label": "Source Text",
        "x": 100,
        "y": 150,
        "config": {}
      },
      {
        "type": "translate",
        "label": "Translate",
        "x": 350,
        "y": 150,
        "config": {
          "source_language_code": "hi-IN",
          "target_language_code": "ta-IN"
        }
      },
      {
        "type": "text_output",
        "label": "Translated Result",
        "x": 600,
        "y": 150,
        "config": {}
      }
    ],
    "edges": [
      {
        "source": 0,
        "target": 1,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 1,
        "target": 2,
        "sourceHandle": "output",
        "targetHandle": "input"
      }
    ]
  },
  {
    "name": "3. Multilingual Text-to-Speech",
    "description": "Takes text input, translates it, and synthesizes it to speech.",
    "nodes": [
      {
        "type": "text_input",
        "label": "Text Input",
        "x": -45,
        "y": 135,
        "config": {
          "text": "Hi Raghu. How are You ?\nIs everything fine?"
        }
      },
      {
        "type": "translate",
        "label": "Translate (En->Hi)",
        "x": 350,
        "y": 150,
        "config": {
          "source_language_code": "en-IN",
          "target_language_code": "te-IN"
        }
      },
      {
        "type": "tts",
        "label": "Text-to-Speech (Hi)",
        "x": 600,
        "y": 150,
        "config": {
          "speaker": "aditya",
          "target_language_code": "te-IN"
        }
      },
      {
        "type": "audio_output",
        "label": "Audio Out",
        "x": 850,
        "y": 150,
        "config": {}
      }
    ],
    "edges": [
      {
        "source": 0,
        "target": 1,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 1,
        "target": 2,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 2,
        "target": 3,
        "sourceHandle": "output",
        "targetHandle": "input"
      }
    ]
  },
  {
    "name": "3. Regional Debate Podcast & Outbound SMS Dispatch",
    "description": "Generates a 2-speaker podcast debate script on a topic, synthesizes multi-voice WAV files, and dispatches the raw transcript to the producer.",
    "nodes": [
      {
        "type": "text_input",
        "label": "Podcast Topic",
        "x": -210,
        "y": 210,
        "config": {
          "text": "Impact of digital payments in rural India"
        }
      },
      {
        "type": "podcast",
        "label": "Podcast Script & Synthesis",
        "x": 135,
        "y": 225,
        "config": {
          "turns": 4,
          "speaker_a": "aditya",
          "speaker_b": "ritu",
          "script_type": "formal",
          "conversation_style": "casual",
          "target_language_code": "te-IN"
        }
      },
      {
        "type": "audio_output",
        "label": "Listen to Podcast",
        "x": 500,
        "y": 350,
        "config": {}
      }
    ],
    "edges": [
      {
        "source": 0,
        "target": 1,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 1,
        "target": 2,
        "sourceHandle": "output",
        "targetHandle": "input"
      }
    ]
  },
  {
    "name": "4. Phonetic Transliteration Speech Broadcaster",
    "description": "Translates inputs to Tamil, transliterates Tamil letters phonetically into Latin characters so non-native readers can read it, and plays the audio.",
    "nodes": [
      {
        "type": "text_input",
        "label": "Hindi Message Input",
        "x": 50,
        "y": 250,
        "config": {
          "text": "आपका दिन मंगलमय हो!"
        }
      },
      {
        "type": "translate",
        "label": "Translate to Tamil",
        "x": 250,
        "y": 250,
        "config": {
          "source_language_code": "hi-IN",
          "target_language_code": "ta-IN"
        }
      },
      {
        "type": "transliteration",
        "label": "Tamil to Latin phonetic",
        "x": 480,
        "y": 150,
        "config": {
          "source_script": "Tamil",
          "target_script": "Latin"
        }
      },
      {
        "type": "tts",
        "label": "Tamil Audio Synthesis",
        "x": 480,
        "y": 350,
        "config": {
          "speaker": "kavya",
          "target_language_code": "ta-IN"
        }
      },
      {
        "type": "text_output",
        "label": "Phonetic Text Reader",
        "x": 750,
        "y": 150,
        "config": {}
      },
      {
        "type": "audio_output",
        "label": "Listen Audio Stream",
        "x": 750,
        "y": 350,
        "config": {}
      }
    ],
    "edges": [
      {
        "source": 0,
        "target": 1,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 1,
        "target": 2,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 1,
        "target": 3,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 2,
        "target": 4,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 3,
        "target": 5,
        "sourceHandle": "output",
        "targetHandle": "input"
      }
    ]
  },
  {
    "name": "4. Voice-to-Voice Translation",
    "description": "Translates spoken audio into another language and synthesizes it back to speech.",
    "nodes": [
      {
        "type": "audio_input",
        "label": "Audio Upload",
        "x": 100,
        "y": 150,
        "config": {
          "input_type": "mic"
        }
      },
      {
        "type": "stt",
        "label": "Speech-to-Text",
        "x": 360,
        "y": -60,
        "config": {
          "model": "saaras:v3",
          "language_code": "en-IN"
        }
      },
      {
        "type": "translate",
        "label": "Translate (Hi->Te)",
        "x": 600,
        "y": 270,
        "config": {
          "source_language_code": "en-IN",
          "target_language_code": "te-IN"
        }
      },
      {
        "type": "tts",
        "label": "Text-to-Speech (Te)",
        "x": 810,
        "y": 0,
        "config": {
          "speaker": "ritu",
          "target_language_code": "te-IN"
        }
      },
      {
        "type": "audio_output",
        "label": "Audio Out",
        "x": 1125,
        "y": 150,
        "config": {}
      }
    ],
    "edges": [
      {
        "source": 0,
        "target": 1,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 1,
        "target": 2,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 2,
        "target": 3,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 3,
        "target": 4,
        "sourceHandle": "output",
        "targetHandle": "input"
      }
    ]
  },
  {
    "name": "5. Dual Audio Broadcast (Branched)",
    "description": "Synthesizes text into both Hindi and Telugu concurrently.",
    "nodes": [
      {
        "type": "text_input",
        "label": "English Input",
        "x": 100,
        "y": 250,
        "config": {
          "text": "Hi Arun, Where are you? I am so worried about you"
        }
      },
      {
        "type": "translate",
        "label": "Translate to Hindi",
        "x": 400,
        "y": 150,
        "config": {
          "source_language_code": "en-IN",
          "target_language_code": "hi-IN"
        }
      },
      {
        "type": "translate",
        "label": "Translate to Telugu",
        "x": 400,
        "y": 350,
        "config": {
          "source_language_code": "en-IN",
          "target_language_code": "te-IN"
        }
      },
      {
        "type": "tts",
        "label": "Hindi Audio",
        "x": 700,
        "y": 150,
        "config": {
          "speaker": "aditya",
          "target_language_code": "hi-IN"
        }
      },
      {
        "type": "tts",
        "label": "Telugu Audio",
        "x": 700,
        "y": 350,
        "config": {
          "speaker": "ritu",
          "target_language_code": "te-IN"
        }
      },
      {
        "type": "audio_output",
        "label": "Hindi Out",
        "x": 1000,
        "y": 150,
        "config": {}
      },
      {
        "type": "audio_output",
        "label": "Telugu Out",
        "x": 1000,
        "y": 350,
        "config": {}
      }
    ],
    "edges": [
      {
        "source": 0,
        "target": 1,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 0,
        "target": 2,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 1,
        "target": 3,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 2,
        "target": 4,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 3,
        "target": 5,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 4,
        "target": 6,
        "sourceHandle": "output",
        "targetHandle": "input"
      }
    ]
  },
  {
    "name": "5. Hinglish Feedback Analyzer & Slack Hook Log",
    "description": "Cleans code-mixed Hinglish inputs, determines sentiment rating, and conditional logs negatives to Slack.",
    "nodes": [
      {
        "type": "audio_input",
        "label": "Customer Reviews Audio",
        "x": 50,
        "y": 250,
        "config": {
          "input_type": "upload"
        }
      },
      {
        "type": "stt",
        "label": "Speech-to-Text Conversion",
        "x": 250,
        "y": 250,
        "config": {
          "model": "saaras:v3",
          "language_code": "hi-IN"
        }
      },
      {
        "type": "codemix_normalizer",
        "label": "Normalise Mixed Hinglish",
        "x": 480,
        "y": 250,
        "config": {
          "target_language": "Hindi"
        }
      },
      {
        "type": "sentiment",
        "label": "Sentiment Rating",
        "x": 700,
        "y": 250,
        "config": {}
      },
      {
        "type": "router",
        "label": "Is Customer Dissatisfied?",
        "x": 920,
        "y": 250,
        "config": {
          "condition_type": "contains",
          "condition_value": "negative"
        }
      },
      {
        "type": "webhook",
        "label": "Post to Slack Log",
        "x": 1180,
        "y": 250,
        "config": {
          "http_method": "POST",
          "webhook_url": "https://httpbin.org/post"
        }
      }
    ],
    "edges": [
      {
        "source": 0,
        "target": 1,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 1,
        "target": 2,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 2,
        "target": 3,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 3,
        "target": 4,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 4,
        "target": 5,
        "sourceHandle": "true",
        "targetHandle": "input"
      }
    ]
  },
  {
    "name": "6. 2-Speaker Podcast Generator",
    "description": "Input a topic, generate a 2-speaker debate dialogue script, and synthesize the combined multi-speaker spoken podcast audio.",
    "nodes": [
      {
        "type": "text_input",
        "label": "Enter Podcast Topic",
        "x": 80,
        "y": 250,
        "config": {
          "default_text": "Artificial Intelligence: Boon or Bane"
        }
      },
      {
        "type": "podcast",
        "label": "Podcast Script & Synthesis",
        "x": 380,
        "y": 250,
        "config": {
          "turns": 4,
          "speaker_a": "aditya",
          "speaker_b": "ritu",
          "target_language_code": "hi-IN"
        }
      },
      {
        "type": "text_output",
        "label": "Dialogue Transcript",
        "x": 680,
        "y": 150,
        "config": {}
      },
      {
        "type": "audio_output",
        "label": "Play Conversational Podcast",
        "x": 680,
        "y": 350,
        "config": {}
      }
    ],
    "edges": [
      {
        "source": 0,
        "target": 1,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 1,
        "target": 2,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 1,
        "target": 3,
        "sourceHandle": "output",
        "targetHandle": "input"
      }
    ]
  },
  {
    "name": "6. Auto-IVR Voice Routing Agent",
    "description": "Simulates telephone IVR: transcribes spoken answers, conditional routes based on keywords, adds a 3s delay, and speaks back confirmation in Telugu.",
    "nodes": [
      {
        "type": "audio_input",
        "label": "Caller Audio Input",
        "x": 50,
        "y": 250,
        "config": {
          "input_type": "upload"
        }
      },
      {
        "type": "stt",
        "label": "Saaras Speech-to-Text",
        "x": 250,
        "y": 250,
        "config": {
          "model": "saaras:v3",
          "language_code": "hi-IN"
        }
      },
      {
        "type": "router",
        "label": "Wants Customer Support?",
        "x": 480,
        "y": 250,
        "config": {
          "condition_type": "contains",
          "condition_value": "support"
        }
      },
      {
        "type": "delay",
        "label": "Pause 3 seconds",
        "x": 700,
        "y": 150,
        "config": {
          "duration": 3
        }
      },
      {
        "type": "tts",
        "label": "Speak confirmation",
        "x": 920,
        "y": 150,
        "config": {
          "speaker": "ritu",
          "target_language_code": "te-IN"
        }
      },
      {
        "type": "audio_output",
        "label": "Play Confirmation Audio",
        "x": 1150,
        "y": 150,
        "config": {}
      }
    ],
    "edges": [
      {
        "source": 0,
        "target": 1,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 1,
        "target": 2,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 2,
        "target": 3,
        "sourceHandle": "true",
        "targetHandle": "input"
      },
      {
        "source": 3,
        "target": 4,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 4,
        "target": 5,
        "sourceHandle": "output",
        "targetHandle": "input"
      }
    ]
  },
  {
    "name": "7. Advanced Document Vision & Audio Alert",
    "description": "Digitises uploaded PDFs or invoice images, translates the extracted metadata, and synthesizes audio alerts for localized records.",
    "nodes": [
      {
        "type": "document_input",
        "label": "Upload Document / Invoice",
        "x": 80,
        "y": 250,
        "config": {
          "format": "pdf"
        }
      },
      {
        "type": "vision",
        "label": "Document AI & Prompt Analysis",
        "x": 330,
        "y": 45,
        "config": {
          "prompt": "Extract key invoice details including vendor name, total amount, and items list.",
          "language": "en-IN"
        }
      },
      {
        "type": "translate",
        "label": "Translate to Telugu",
        "x": 600,
        "y": 250,
        "config": {
          "mode": "formal",
          "source_language_code": "auto",
          "target_language_code": "te-IN"
        }
      },
      {
        "type": "text_output",
        "label": "Translated Metadata",
        "x": 860,
        "y": 150,
        "config": {}
      },
      {
        "type": "tts",
        "label": "Synthesize Voice Alert",
        "x": 860,
        "y": 350,
        "config": {
          "pace": 1,
          "model": "bulbul:v3",
          "speaker": "ritu",
          "target_language_code": "te-IN"
        }
      },
      {
        "type": "audio_output",
        "label": "Play Audio Alert",
        "x": 1120,
        "y": 350,
        "config": {}
      }
    ],
    "edges": [
      {
        "source": 0,
        "target": 1,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 1,
        "target": 2,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 2,
        "target": 3,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 2,
        "target": 4,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 4,
        "target": 5,
        "sourceHandle": "output",
        "targetHandle": "input"
      }
    ]
  },
  {
    "name": "7. Scanned Invoice OCR, Translation & Webhook Push",
    "description": "Extracts billing texts from scanned invoice invoice images (OCR), translates it to English, extracts total cost, and hits external databases.",
    "nodes": [
      {
        "type": "image_input",
        "label": "Scanned Invoice Image",
        "x": 50,
        "y": 250,
        "config": {}
      },
      {
        "type": "ocr",
        "label": "Invoice OCR Extract",
        "x": 250,
        "y": 250,
        "config": {}
      },
      {
        "type": "translate",
        "label": "Translate to English",
        "x": 480,
        "y": 250,
        "config": {
          "source_language_code": "hi-IN",
          "target_language_code": "en-IN"
        }
      },
      {
        "type": "summarize",
        "label": "Digest Invoice terms",
        "x": 700,
        "y": 250,
        "config": {
          "length": "short"
        }
      },
      {
        "type": "webhook",
        "label": "Webhook database logging",
        "x": 920,
        "y": 250,
        "config": {
          "http_method": "POST",
          "webhook_url": "https://httpbin.org/post"
        }
      }
    ],
    "edges": [
      {
        "source": 0,
        "target": 1,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 1,
        "target": 2,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 2,
        "target": 3,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 3,
        "target": 4,
        "sourceHandle": "output",
        "targetHandle": "input"
      }
    ]
  },
  {
    "name": "8. Document Vision & OCR Pipeline",
    "description": "Extract text from documents and analyze visually with Vision AI.",
    "nodes": [
      {
        "type": "document_input",
        "label": "Document Upload",
        "x": 150,
        "y": 195,
        "config": {
          "format": "pdf"
        }
      },
      {
        "type": "ocr",
        "label": "Extract Text (OCR)",
        "x": 400,
        "y": 100,
        "config": {}
      },
      {
        "type": "vision",
        "label": "Vision Analysis",
        "x": 400,
        "y": 300,
        "config": {
          "prompt": "Extract key insights from this document."
        }
      },
      {
        "type": "text_output",
        "label": "OCR Results",
        "x": 700,
        "y": 100,
        "config": {}
      },
      {
        "type": "text_output",
        "label": "Vision Insights",
        "x": 700,
        "y": 300,
        "config": {}
      }
    ],
    "edges": [
      {
        "source": 0,
        "target": 1,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 0,
        "target": 2,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 1,
        "target": 3,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 2,
        "target": 4,
        "sourceHandle": "output",
        "targetHandle": "input"
      }
    ]
  },
  {
    "name": "8. Transliterated Outbound SMS Broadcaster",
    "description": "Takes English message, translates to Hindi, transliterates to Roman text, and texts it to the recipient.",
    "nodes": [
      {
        "type": "text_input",
        "label": "Alert Message (En)",
        "x": 50,
        "y": 250,
        "config": {
          "text": "Congratulations on winning your match!"
        }
      },
      {
        "type": "translate",
        "label": "Translate to Hindi",
        "x": 250,
        "y": 250,
        "config": {
          "source_language_code": "en-IN",
          "target_language_code": "hi-IN"
        }
      },
      {
        "type": "transliteration",
        "label": "Romanized translit",
        "x": 480,
        "y": 250,
        "config": {
          "source_script": "Devanagari",
          "target_script": "Latin"
        }
      }
    ],
    "edges": [
      {
        "source": 0,
        "target": 1,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 1,
        "target": 2,
        "sourceHandle": "output",
        "targetHandle": "input"
      }
    ]
  },
  {
    "name": "9. Advanced Call Center Analytics",
    "description": "Transcribes customer audio calls, detects sentiment, translates context, summarizes transcripts, and synthesizes Telugu voice alerts.",
    "nodes": [
      {
        "type": "audio_input",
        "label": "Call Recording Upload",
        "x": 80,
        "y": 250,
        "config": {
          "input_type": "upload"
        }
      },
      {
        "type": "stt",
        "label": "Transcribe Customer Call",
        "x": 340,
        "y": 250,
        "config": {
          "mode": "transcribe",
          "model": "saaras:v3",
          "language_code": "hi-IN"
        }
      },
      {
        "type": "sentiment",
        "label": "Detect Sentiment",
        "x": 600,
        "y": 100,
        "config": {
          "format": "json"
        }
      },
      {
        "type": "summarize",
        "label": "Generate Summary",
        "x": 600,
        "y": 250,
        "config": {
          "length": "short"
        }
      },
      {
        "type": "translate",
        "label": "Translate to Telugu",
        "x": 600,
        "y": 400,
        "config": {
          "mode": "formal",
          "source_language_code": "auto",
          "target_language_code": "te-IN"
        }
      },
      {
        "type": "text_output",
        "label": "Sentiment Label",
        "x": 860,
        "y": 100,
        "config": {}
      },
      {
        "type": "text_output",
        "label": "Summary Display",
        "x": 860,
        "y": 250,
        "config": {}
      },
      {
        "type": "tts",
        "label": "Synthesize Voice Alert",
        "x": 860,
        "y": 400,
        "config": {
          "pace": 1,
          "model": "bulbul:v3",
          "speaker": "ritu",
          "target_language_code": "te-IN"
        }
      },
      {
        "type": "audio_output",
        "label": "Play Voice Response",
        "x": 1120,
        "y": 400,
        "config": {}
      }
    ],
    "edges": [
      {
        "source": 0,
        "target": 1,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 1,
        "target": 2,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 1,
        "target": 3,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 1,
        "target": 4,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 2,
        "target": 5,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 3,
        "target": 6,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 4,
        "target": 7,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 7,
        "target": 8,
        "sourceHandle": "output",
        "targetHandle": "input"
      }
    ]
  },
  {
    "name": "9. Mixed-Speech Podcast Summariser Workflow",
    "description": "Cleans up raw code-mixed text reviews, structures a formal argument debate, and plays it back to managers.",
    "nodes": [
      {
        "type": "text_input",
        "label": "Hinglish Feed Review",
        "x": 50,
        "y": 250,
        "config": {
          "text": "delivery speed fast thha but packing kharab thhi"
        }
      },
      {
        "type": "codemix_normalizer",
        "label": "Hinglish to English Cleaner",
        "x": 250,
        "y": 250,
        "config": {
          "target_language": "English"
        }
      },
      {
        "type": "podcast",
        "label": "Podcast Summarizer debate",
        "x": 480,
        "y": 250,
        "config": {
          "turns": 4,
          "speaker_a": "rohan",
          "speaker_b": "neha",
          "target_language_code": "en-IN"
        }
      },
      {
        "type": "audio_output",
        "label": "Listen to Podcast",
        "x": 720,
        "y": 250,
        "config": {}
      }
    ],
    "edges": [
      {
        "source": 0,
        "target": 1,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 1,
        "target": 2,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 2,
        "target": 3,
        "sourceHandle": "output",
        "targetHandle": "input"
      }
    ]
  },
  {
    "name": "10. Advanced Indic Language & LLM Workspace",
    "description": "Multi-branched workflow translating input audio, extracting metadata, analyzing sentiment, and summarizing output to speech.",
    "nodes": [
      {
        "type": "audio_input",
        "label": "Hindi Audio Upload",
        "x": 50,
        "y": 300,
        "config": {
          "input_type": "upload"
        }
      },
      {
        "type": "stt",
        "label": "Hindi Speech-to-Text",
        "x": 250,
        "y": 300,
        "config": {
          "model": "saaras:v3",
          "language_code": "hi-IN"
        }
      },
      {
        "type": "translate",
        "label": "Translate (Hi->En)",
        "x": 450,
        "y": 300,
        "config": {
          "source_language_code": "hi-IN",
          "target_language_code": "en-IN"
        }
      },
      {
        "type": "sentiment",
        "label": "Sentiment Classifier",
        "x": 700,
        "y": 100,
        "config": {
          "format": "text"
        }
      },
      {
        "type": "summarize",
        "label": "Summary Generator",
        "x": 700,
        "y": 250,
        "config": {
          "length": "short"
        }
      },
      {
        "type": "keyword_extraction",
        "label": "Keywords Extractor",
        "x": 700,
        "y": 400,
        "config": {
          "max_keywords": 5
        }
      },
      {
        "type": "classification",
        "label": "Category Classifier",
        "x": 700,
        "y": 550,
        "config": {
          "categories": "News, Tech, Support, Feedback"
        }
      },
      {
        "type": "text_output",
        "label": "Sentiment Output",
        "x": 950,
        "y": 50,
        "config": {}
      },
      {
        "type": "text_output",
        "label": "English Summary Text",
        "x": 950,
        "y": 150,
        "config": {}
      },
      {
        "type": "translate",
        "label": "Translate Summary (En->Te)",
        "x": 950,
        "y": 250,
        "config": {
          "source_language_code": "en-IN",
          "target_language_code": "te-IN"
        }
      },
      {
        "type": "text_output",
        "label": "Extracted Keywords",
        "x": 950,
        "y": 400,
        "config": {}
      },
      {
        "type": "text_output",
        "label": "Classification Tag",
        "x": 950,
        "y": 550,
        "config": {}
      },
      {
        "type": "tts",
        "label": "Telugu Audio Synthesis",
        "x": 1200,
        "y": 250,
        "config": {
          "speaker": "ritu",
          "target_language_code": "te-IN"
        }
      },
      {
        "type": "audio_output",
        "label": "Telugu Summary Audio",
        "x": 1450,
        "y": 250,
        "config": {}
      }
    ],
    "edges": [
      {
        "source": 0,
        "target": 1
      },
      {
        "source": 1,
        "target": 2
      },
      {
        "source": 2,
        "target": 3
      },
      {
        "source": 2,
        "target": 4
      },
      {
        "source": 2,
        "target": 5
      },
      {
        "source": 2,
        "target": 6
      },
      {
        "source": 3,
        "target": 7
      },
      {
        "source": 4,
        "target": 8
      },
      {
        "source": 4,
        "target": 9
      },
      {
        "source": 5,
        "target": 10
      },
      {
        "source": 6,
        "target": 11
      },
      {
        "source": 9,
        "target": 12
      },
      {
        "source": 12,
        "target": 13
      }
    ]
  },
  {
    "name": "10. RAG Document-Search Audio Guide Generator",
    "description": "Queries reference documents for travel summaries, translates query answers to Hindi, synthesizes Hindi audio, and plays guide.",
    "nodes": [
      {
        "type": "text_input",
        "label": "Guide Question",
        "x": 45,
        "y": 255,
        "config": {
          "text": "Taj Mahal entry guidelines"
        }
      },
      {
        "type": "vector_search",
        "label": "Query vector context",
        "x": 255,
        "y": 60,
        "config": {
          "query": "Taj Mahal rules",
          "fallback_context": "Guideline 1: Taj Mahal opens 30 minutes before sunrise.\n\nGuideline 2: Cameras are allowed inside the complex."
        }
      },
      {
        "type": "llm",
        "label": "LLM Guide writer",
        "x": 480,
        "y": 450,
        "config": {
          "system_prompt": "You write short spoken-word audio guide answers. Use only the retrieved passages provided to you, and keep the result under 80 words so it reads naturally aloud.",
          "prompt": "Write an audio guide answer from the retrieved passages below.",
          "temperature": 0.2
        }
      },
      {
        "type": "translate",
        "label": "Translate to Hindi",
        "x": 645,
        "y": 105,
        "config": {
          "source_language_code": "en-IN",
          "target_language_code": "hi-IN"
        }
      },
      {
        "type": "tts",
        "label": "Hindi voice Synthesis",
        "x": 915,
        "y": 375,
        "config": {
          "speaker": "aditya",
          "target_language_code": "hi-IN"
        }
      },
      {
        "type": "audio_output",
        "label": "Play Audio Guide",
        "x": 1155,
        "y": 180,
        "config": {}
      }
    ],
    "edges": [
      {
        "source": 0,
        "target": 1,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 1,
        "target": 2,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 2,
        "target": 3,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 3,
        "target": 4,
        "sourceHandle": "output",
        "targetHandle": "input"
      },
      {
        "source": 4,
        "target": 5,
        "sourceHandle": "output",
        "targetHandle": "input"
      }
    ]
  }
];
