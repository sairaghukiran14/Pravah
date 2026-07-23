import { NodeType } from '@/types/pipeline';

interface CallClaudeParams {
  systemPrompt: string;
  userPrompt: string;
}

export async function callClaudeHaiku({ systemPrompt, userPrompt }: CallClaudeParams): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey === 'mock_anthropic_key') {
    console.warn('Anthropic API key is missing. Falling back to mock generator.');
    return `[Mock Claude Haiku Response] System Prompt: ${systemPrompt.substring(0, 40)}... | Input: ${userPrompt.substring(0, 40)}...`;
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || `Anthropic API returned status ${res.status}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text || '';
  } catch (error: any) {
    console.error('Anthropic API Call failed:', error);
    throw new Error(error.message || 'Claude execution failed');
  }
}

export async function executeAnthropicNode(
  nodeType: NodeType,
  inputText: string,
  config: Record<string, any> = {}
): Promise<any> {
  let systemPrompt = 'You are a helpful assistant.';
  let userPrompt = inputText;

  switch (nodeType) {
    case 'llm':
      systemPrompt = config.system_prompt || 'You are a helpful assistant responding to queries in a clear and concise format.';
      userPrompt = config.prompt_template 
        ? config.prompt_template.replace('{{input}}', inputText)
        : inputText;
      break;

    case 'summarize':
      systemPrompt = 'You are an expert summarizer. Compress the provided text into a clean summary. Use short sentences and bullet points if necessary. Do not add introductory remarks.';
      userPrompt = `Please summarize this text:\n\n${inputText}`;
      break;

    case 'sentiment':
      systemPrompt = 'You are a sentiment analysis agent. Classify the user text. Respond with exactly one word: POSITIVE, NEUTRAL, or NEGATIVE. Do not include any punctuation, details, or reasoning.';
      userPrompt = inputText;
      break;

    case 'keyword_extraction':
      systemPrompt = 'You are a metadata extraction tool. Extract the top 5 key tags or concepts from the provided text, separated by commas. Return ONLY the comma-separated list of tags, without explanation or numbering.';
      userPrompt = inputText;
      break;

    case 'classification':
      const categories = config.categories || 'News, Finance, Tech, Entertainment, Other';
      systemPrompt = `You are a categorization classifier. Match the user text to one of the following tags: [${categories}]. Return ONLY the single matched tag name. Do not explain your choice.`;
      userPrompt = inputText;
      break;

    default:
      throw new Error(`Unsupported Anthropic processing node: ${nodeType}`);
  }

  const resultText = await callClaudeHaiku({ systemPrompt, userPrompt });

  // Return clean structured outputs depending on type
  switch (nodeType) {
    case 'sentiment':
      return { sentiment: resultText.trim().toUpperCase() };
    case 'keyword_extraction':
      return { keywords: resultText.split(',').map(k => k.trim()) };
    case 'classification':
      return { category: resultText.trim() };
    case 'summarize':
      return { summary: resultText };
    default:
      return { response: resultText };
  }
}
