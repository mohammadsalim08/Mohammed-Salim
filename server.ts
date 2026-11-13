import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const portArgIndex = process.argv.indexOf('--port');
const cliPort = portArgIndex !== -1 ? Number(process.argv[portArgIndex + 1]) : NaN;
const isProduction = process.env.NODE_ENV === 'production';
const port =
  !Number.isNaN(cliPort) && cliPort > 0
    ? cliPort
    : isProduction
    ? Number(process.env.PORT || 3000)
    : Number(process.env.DEFAULT_APP_PORT || 3000);

app.use(express.json({ limit: '1mb' }));

const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const VIZAG_AI_SYSTEM_INSTRUCTION = `BRAND IDENTITY:
Name: Vizag AI
Tagline: Your AI. Your City. Your World.
Primary identity: Visakhapatnam's intelligent AI assistant on VizagConnect.
Secondary capability: Capable general-purpose AI assistant for everyone.

PRIORITY SYSTEM (CRITICAL):
1. VIZAG FIRST:
   For questions about Visakhapatnam (Vizag), prioritize local knowledge, verified VizagConnect businesses provided in context, real listed product prices/offers, local services, tourism destinations, education, jobs, events, and city information.
2. GENERAL AI SECOND:
   For questions unrelated to Visakhapatnam, behave as a capable, friendly general-purpose AI assistant. Answer questions clearly and accurately about the world, education, coding, science, business, technology, writing, and everyday life.
3. SMART CONTEXT:
   Always detect whether the user's question is local (about Visakhapatnam / Vizag / local shops / Vizag tourism) or general. NEVER force Vizag or local business ads into an unrelated general question!
4. LOCAL BUSINESS INTEGRATION:
   Only recommend real approved business database records provided below in context or verified current information from web search. NEVER invent fake businesses, phone numbers, WhatsApp numbers, or product prices. If a local category currently has no matching registered business in the provided VizagConnect database, state that honestly and encourage browsing VizagConnect or web search results where helpful.
5. CURRENT INFORMATION:
   Use Google Search grounding for current news, events, timings, prices, and changing facts. Clearly note uncertain or unavailable details.
6. LANGUAGE SUPPORT:
   Respond naturally in the user's language (Telugu / తెలుగు, Hindi / हिन्दी, or English).
7. SAFETY:
   Follow applicable laws, privacy norms, and responsible AI safety policies.`;

function detectLanguage(text: string): 'telugu' | 'hindi' | 'english' {
  if (/[\u0C00-\u0C7F]/.test(text)) return 'telugu';
  if (/[\u0900-\u097F]/.test(text)) return 'hindi';
  const lower = text.toLowerCase();
  if (
    lower.includes('ekkada') ||
    lower.includes('kavali') ||
    lower.includes('namaskaram') ||
    lower.includes('chepandi')
  )
    return 'telugu';
  if (
    lower.includes('kahan') ||
    lower.includes('chahiye') ||
    lower.includes('namaste') ||
    lower.includes('bataiye')
  )
    return 'hindi';
  return 'english';
}

interface AiFallbackAttempt {
  label: string;
  model: string;
  useSearchGrounding: boolean;
}

const AI_ATTEMPTS: AiFallbackAttempt[] = [
  { label: 'gemini-4-hydrogen+search', model: 'gemini-4-hydrogen', useSearchGrounding: true },
  { label: 'gemini-4-hydrogen', model: 'gemini-4-hydrogen', useSearchGrounding: false },
  { label: 'gemini-3.1-flash-lite', model: 'gemini-3.1-flash-lite', useSearchGrounding: false },
];

async function generateWithModelFallback(
  client: GoogleGenAI,
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  systemInstruction: string
) {
  let lastError: unknown = null;

  for (const attempt of AI_ATTEMPTS) {
    try {
      const response = await client.models.generateContent({
        model: attempt.model,
        contents,
        config: {
          systemInstruction,
          ...(attempt.useSearchGrounding ? { tools: [{ googleSearch: {} }] } : {}),
        },
      });
      return { response, usedSearchGrounding: attempt.useSearchGrounding, modelUsed: attempt.model };
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`Vizag AI attempt (${attempt.label}) failed:`, errMsg.slice(0, 180));
    }
  }

  throw lastError;
}

app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages, userLocation, preferredLanguage, registeredBusinesses, tourismPlaces } =
      req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const lastUserMsg = messages[messages.length - 1]?.text || '';
    const lang =
      preferredLanguage === 'telugu' || preferredLanguage === 'hindi' || preferredLanguage === 'english'
        ? preferredLanguage
        : detectLanguage(lastUserMsg);

    let businessContext = '';
    if (Array.isArray(registeredBusinesses) && registeredBusinesses.length > 0) {
      businessContext =
        `\nVERIFIED APPROVED BUSINESSES IN VIZAGCONNECT DATABASE (Use ONLY for Vizag business queries; never invent unverified entries):\n` +
        registeredBusinesses
          .map((b: Record<string, unknown>) => {
            const productsArr = Array.isArray(b.products) ? b.products : [];
            const productSummary =
              productsArr.length > 0
                ? ` | Listed Catalog: ${productsArr
                    .map(
                      (p: Record<string, unknown>) =>
                        `${p.name} ₹${p.price}${p.unit ? '/' + p.unit : ''} (${p.availability})`
                    )
                    .join('; ')}`
                : '';
            const offersArr = Array.isArray(b.offers) ? b.offers : [];
            const offerSummary = offersArr.length > 0 ? ` | Offers: ${offersArr.join('; ')}` : '';
            return `- ${b.name}${b.teluguName ? ` (${b.teluguName})` : ''}: ${b.scale} | Category: ${b.category} | Address: ${b.address}, ${b.area} | Phone: ${b.phone} | WhatsApp: ${b.whatsapp || 'N/A'} | Offerings: ${
              Array.isArray(b.offerings) ? b.offerings.join(', ') : b.offerings || ''
            }${productSummary}${offerSummary}`;
          })
          .join('\n');
    }

    let tourismContext = '';
    if (Array.isArray(tourismPlaces) && tourismPlaces.length > 0) {
      tourismContext =
        `\nOFFICIAL VISAKHAPATNAM TOURISM PLACES ON VIZAGCONNECT:\n` +
        tourismPlaces
          .map(
            (d: Record<string, unknown>) =>
              `- ${d.name} (${d.area}): Timings ${d.timings}; Entry: ${d.entryInfo}`
          )
          .join('\n');
    }

    if (!aiClient || !apiKey) {
      return res.status(503).json({
        error: 'Live Vizag AI is temporarily offline (server AI service is not configured).',
      });
    }

    const mappedContents = messages
      .filter((m: { role?: string; text?: string }) => typeof m?.text === 'string' && m.text.trim().length > 0)
      .map((m: { role: 'user' | 'model'; text: string }) => ({
        role: (m.role === 'model' ? 'model' : 'user') as 'user' | 'model',
        parts: [{ text: m.text }],
      }));

    // Gemini generateContent conversations should begin with a user turn
    const firstUserIdx = mappedContents.findIndex((c) => c.role === 'user');
    const contents = firstUserIdx >= 0 ? mappedContents.slice(firstUserIdx) : mappedContents;

    if (contents.length === 0) {
      return res.status(400).json({ error: 'At least one non-empty user message is required.' });
    }

    const languageDirective =
      preferredLanguage && preferredLanguage !== 'auto'
        ? `User selected preferred language: ${preferredLanguage}. Respond in ${preferredLanguage}.`
        : `Respond in the user's message language (detected: ${lang}).`;

    const fullSystemInstruction =
      VIZAG_AI_SYSTEM_INSTRUCTION +
      businessContext +
      tourismContext +
      (userLocation ? `\nUser selected locality context: ${userLocation}.` : '') +
      `\n${languageDirective}`;

    const { response, usedSearchGrounding } = await generateWithModelFallback(
      aiClient,
      contents,
      fullSystemInstruction
    );

    const replyText =
      response.text ||
      (lang === 'telugu'
        ? 'నేను మీకు ఎలా సహాయపడగలను?'
        : lang === 'hindi'
        ? 'मैं आपकी किस प्रकार सहायता कर सकता हूँ?'
        : 'How can I help you today?');

    const rawChunks = usedSearchGrounding
      ? response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
      : [];
    const sources = rawChunks
      .filter((chunk: { web?: { uri?: string; title?: string } }) => chunk.web && chunk.web.uri)
      .map((chunk: { web?: { uri?: string; title?: string } }) => ({
        web: {
          title: chunk.web?.title || 'Web Reference',
          uri: chunk.web?.uri || '',
        },
      }))
      .slice(0, 4);

    return res.json({ reply: replyText, sources });
  } catch (error: unknown) {
    const rawMsg = error instanceof Error ? error.message : 'Unknown upstream error';
    const lowerMsg = rawMsg.toLowerCase();
    const isQuota =
      rawMsg.includes('429') ||
      lowerMsg.includes('quota') ||
      lowerMsg.includes('resource_exhausted');
    const isAuthKey =
      rawMsg.includes('403') ||
      lowerMsg.includes('permission_denied') ||
      lowerMsg.includes('api_key_invalid') ||
      lowerMsg.includes('api key not valid');

    console.error('Error generating AI response:', rawMsg.slice(0, 240));

    if (isQuota) {
      return res.status(429).json({
        error:
          'Vizag AI has reached its temporary Gemini API request quota limit. Please wait a moment and try again.',
      });
    }
    if (isAuthKey) {
      return res.status(403).json({
        error:
          'Vizag AI is temporarily unavailable due to an upstream Gemini authorization error.',
      });
    }

    return res.status(502).json({
      error: 'Unable to reach Vizag AI service right now. Please try again in a moment.',
    });
  }
});

async function setupApp() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`VIZAGCONNECT server running at http://0.0.0.0:${port}`);
  });
}

setupApp().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
