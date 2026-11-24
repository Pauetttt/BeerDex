import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { getAiBinding } from '../config/runtimeBindings';
import { HttpError } from '../utils/httpError';

export type DetectedScanObject =
  | 'botella'
  | 'lata'
  | 'litrona'
  | 'caja'
  | 'pack'
  | 'pantalla'
  | 'papel_plano'
  | 'otro';

export interface AntiCheatResult {
  allowed: boolean;
  es_pantalla: boolean;
  tipo_detectado: DetectedScanObject;
  confianza: number;
  motivo: string;
  skipped?: boolean;
}

const VALID_DETECTED_TYPES = new Set<DetectedScanObject>([
  'botella',
  'lata',
  'litrona',
  'caja',
  'pack',
  'pantalla',
  'papel_plano',
  'otro',
]);

const ANTI_CHEAT_PROMPT = `Eres un verificador antitrampas para una app de coleccionismo de cervezas (BeerDex).
Analiza la foto capturada automáticamente en el instante en que la cámara detectó el código de barras.

Debes responder SIEMPRE con JSON estricto siguiendo el esquema:
{
  "es_pantalla": boolean,
  "tipo_detectado": "botella" | "lata" | "litrona" | "caja" | "pack" | "pantalla" | "papel_plano" | "otro",
  "confianza": number (de 0 a 1),
  "motivo": string (breve, en español)
}

Reglas:
- Devuelve "es_pantalla": true cuando el código de barras o la imagen se esté escaneando desde una pantalla digital (monitor de ordenador, portátil, smartphone, tablet, televisor, ventana o pestañas de navegador, cursor de ratón, fondo luminoso de página web o visor de imágenes mostrando una foto/código, bordes o marco del monitor/teclado, rejilla de píxeles LCD, efecto moiré o brillo de pantalla retroiluminada) o desde un folio/papel plano impreso o recorte plano sobre una superficie sin envase tridimensional real. Usa "tipo_detectado": "pantalla" o "papel_plano" según corresponda.
- Devuelve "es_pantalla": false únicamente cuando se trate de una cerveza real en formato físico tridimensional: botella de vidrio, lata metálica, litrona, caja de cervezas o pack real (sostenido en la mano, o sobre una mesa, barra, nevera o estantería real, aunque sea un plano cercano de la etiqueta/código o haya poca luz).`;

type TestEvaluator = (img: {
  mimeType: string;
  data: string;
}) => Promise<AntiCheatResult>;

let testEvaluator: TestEvaluator | null = null;

/** Registra un evaluador simulado para tests unitarios e integración. */
export function setAntiCheatEvaluatorForTest(fn: TestEvaluator | null): void {
  testEvaluator = fn;
}

/** Extrae el tipo MIME y los bytes en base64 limpio desde una data URL o cadena base64. */
export function extractBase64Image(input: string): { mimeType: string; data: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new HttpError(400, 'La imagen capturada para verificación está vacía.');
  }

  const dataUrlMatch = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(trimmed);
  if (dataUrlMatch) {
    const cleanData = dataUrlMatch[2].replace(/\s+/g, '');
    if (cleanData.length < 16) {
      throw new HttpError(400, 'La imagen capturada está incompleta o corrupta.');
    }
    return {
      mimeType: dataUrlMatch[1].toLowerCase(),
      data: cleanData,
    };
  }

  const cleanRaw = trimmed.replace(/\s+/g, '');
  if (cleanRaw.length < 16 || !/^[A-Za-z0-9+/=]+$/.test(cleanRaw)) {
    throw new HttpError(400, 'Formato de imagen base64 inválido.');
  }
  return { mimeType: 'image/jpeg', data: cleanRaw };
}

/** Parsea y normaliza la respuesta JSON devuelta por Gemini Flash. */
export function parseGeminiAntiCheatResponse(rawText: string): AntiCheatResult {
  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    throw new Error(`Respuesta JSON inválida de Gemini: ${cleaned.slice(0, 180)}`);
  }

  const rawType = typeof parsed.tipo_detectado === 'string' ? parsed.tipo_detectado : 'otro';
  const tipoDetectado: DetectedScanObject = VALID_DETECTED_TYPES.has(
    rawType as DetectedScanObject
  )
    ? (rawType as DetectedScanObject)
    : 'otro';

  const esPantallaFlag = Boolean(parsed.es_pantalla);
  const blocked =
    esPantallaFlag || tipoDetectado === 'pantalla' || tipoDetectado === 'papel_plano';

  const rawConf = typeof parsed.confianza === 'number' ? parsed.confianza : 0.8;
  const confianza = Math.min(1, Math.max(0, Number.isFinite(rawConf) ? rawConf : 0.8));
  const motivo =
    typeof parsed.motivo === 'string' && parsed.motivo.trim()
      ? parsed.motivo.trim()
      : blocked
        ? 'Se detectó una pantalla o imagen plana en lugar de un envase real.'
        : 'Envase físico de cerveza verificado.';

  return {
    allowed: !blocked,
    es_pantalla: blocked,
    tipo_detectado: tipoDetectado,
    confianza,
    motivo,
  };
}

/** Construye un mensaje claro de bloqueo antitrampas para el usuario. */
export function buildAntiCheatMessage(result: AntiCheatResult): string {
  if (result.tipo_detectado === 'papel_plano') {
    return 'Aviso antitrampas: hemos detectado un código impreso en papel o folio plano en lugar de un envase real de cerveza.';
  }
  return 'Aviso antitrampas: hemos detectado que estás escaneando una pantalla en lugar de una cerveza real (botella, lata, litrona, caja o pack).';
}

/** Extrae texto JSON de la respuesta de Cloudflare Workers AI (OpenAI chat completions o legacy response). */
export function extractWorkersAiText(rawResponse: unknown): string {
  if (!rawResponse || typeof rawResponse !== 'object') {
    if (typeof rawResponse === 'string') return rawResponse.trim();
    throw new Error('Respuesta vacía de Workers AI.');
  }

  const record = rawResponse as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
      };
    }>;
    response?: unknown;
  };

  const content = record.choices?.[0]?.message?.content;
  if (typeof content === 'string') {
    return content.trim();
  }
  if (Array.isArray(content)) {
    const joined = content
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
      .trim();
    if (joined) return joined;
  }

  if (record.response !== undefined) {
    if (typeof record.response === 'string') {
      return record.response.trim();
    }
    return JSON.stringify(record.response);
  }

  throw new Error('Workers AI devolvió una respuesta sin contenido JSON.');
}

/**
 * Envía el fotograma capturado a Gemini Flash (si hay GEMINI_API_KEY) o
 * Cloudflare Workers AI (@cf/google/gemma-4-26b-a4b-it) para validar que no sea pantalla ni papel plano.
 */
export async function verifyBeerFrameWithGemini(imageInput: {
  base64?: string;
  buffer?: Buffer;
  mimetype?: string;
}): Promise<AntiCheatResult> {
  let payloadImage: { mimeType: string; data: string };
  if (imageInput.base64) {
    payloadImage = extractBase64Image(imageInput.base64);
  } else if (imageInput.buffer && imageInput.buffer.length > 0) {
    payloadImage = {
      mimeType: (imageInput.mimetype || 'image/jpeg').toLowerCase(),
      data: imageInput.buffer.toString('base64'),
    };
  } else {
    throw new HttpError(400, 'Se requiere una captura o foto de la cerveza para verificar.');
  }

  if (process.env.NODE_ENV === 'test') {
    if (testEvaluator) {
      return testEvaluator(payloadImage);
    }
    return {
      allowed: true,
      es_pantalla: false,
      tipo_detectado: 'botella',
      confianza: 1,
      motivo: 'Validación visual omitida en entorno de test',
      skipped: true,
    };
  }

  // 1) Proveedor prioritario opcional: Google AI Studio (si GEMINI_API_KEY está configurada)
  if (env.gemini.apiKey) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        env.gemini.model
      )}:generateContent`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.gemini.apiKey,
        },
        signal: AbortSignal.timeout(7000),
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: ANTI_CHEAT_PROMPT },
                {
                  inlineData: {
                    mimeType: payloadImage.mimeType,
                    data: payloadImage.data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
            thinkingConfig: {
              thinkingBudget: 0,
            },
            responseSchema: {
              type: 'OBJECT',
              properties: {
                es_pantalla: { type: 'BOOLEAN' },
                tipo_detectado: {
                  type: 'STRING',
                  enum: [
                    'botella',
                    'lata',
                    'litrona',
                    'caja',
                    'pack',
                    'pantalla',
                    'papel_plano',
                    'otro',
                  ],
                },
                confianza: { type: 'NUMBER' },
                motivo: { type: 'STRING' },
              },
              required: ['es_pantalla', 'tipo_detectado', 'confianza', 'motivo'],
            },
          },
        }),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status} en Gemini: ${errBody.slice(0, 200)}`);
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };

      const rawText = data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('')
        .trim();

      if (!rawText) {
        throw new Error('Gemini devolvió una respuesta vacía sin texto JSON.');
      }

      return parseGeminiAntiCheatResponse(rawText);
    } catch (err) {
      console.error(
        JSON.stringify({
          event: 'anti_cheat_error',
          provider: 'gemini',
          model: env.gemini.model,
          error: err instanceof Error ? err.message : String(err),
        })
      );
      if (env.gemini.strict) {
        throw new HttpError(
          503,
          'No pudimos verificar la autenticidad de la cerveza. Inténtalo de nuevo en unos segundos.'
        );
      }
      return {
        allowed: true,
        es_pantalla: false,
        tipo_detectado: 'otro',
        confianza: 0,
        motivo: 'Validación visual omitida temporalmente por error del proveedor IA',
        skipped: true,
      };
    }
  }

  // 2) Proveedor nativo gratuito en Cloudflare Workers: Workers AI Vision (@cf/google/gemma-4-26b-a4b-it)
  const ai = getAiBinding();
  if (ai) {
    try {
      const rawResponse = await ai.run(env.workersAi.model, {
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: ANTI_CHEAT_PROMPT },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${payloadImage.mimeType};base64,${payloadImage.data}`,
                },
              },
            ],
          },
        ],
        temperature: 0,
        max_completion_tokens: 220,
        chat_template_kwargs: { enable_thinking: false },
        response_format: { type: 'json_object' },
      });

      const rawText = extractWorkersAiText(rawResponse);
      const result = parseGeminiAntiCheatResponse(rawText);
      console.log(
        JSON.stringify({
          event: 'anti_cheat_decision',
          provider: 'workers-ai',
          model: env.workersAi.model,
          es_pantalla: result.es_pantalla,
          tipo_detectado: result.tipo_detectado,
          confianza: result.confianza,
        })
      );
      return result;
    } catch (err) {
      console.error(
        JSON.stringify({
          event: 'anti_cheat_error',
          provider: 'workers-ai',
          model: env.workersAi.model,
          error: err instanceof Error ? err.message : String(err),
        })
      );
      if (env.gemini.strict) {
        throw new HttpError(
          503,
          'No pudimos verificar la autenticidad de la cerveza. Inténtalo de nuevo en unos segundos.'
        );
      }
      return {
        allowed: true,
        es_pantalla: false,
        tipo_detectado: 'otro',
        confianza: 0,
        motivo: 'Validación visual omitida temporalmente por error del proveedor IA',
        skipped: true,
      };
    }
  }

  if (env.gemini.strict) {
    throw new HttpError(
      503,
      'El sistema antitrampas no está configurado en el servidor.'
    );
  }
  console.warn('[AntiCheat] Ni GEMINI_API_KEY ni Workers AI configurados; omitiendo validación visual.');
  return {
    allowed: true,
    es_pantalla: false,
    tipo_detectado: 'otro',
    confianza: 0,
    motivo: 'Validación visual pendiente de configuración IA',
    skipped: true,
  };
}

interface ScanVerificationPayload {
  purpose: 'beerdex_scan_verified';
  sub: string;
  allowedBrandIds: number[];
  barcode: string;
}

/** Firma un token temporal que acredita que la captura automática superó el antitrampas. */
export function signScanVerificationToken(params: {
  userId: string;
  allowedBrandIds: number[];
  barcode: string;
}): string {
  const payload: ScanVerificationPayload = {
    purpose: 'beerdex_scan_verified',
    sub: params.userId,
    allowedBrandIds: Array.from(new Set(params.allowedBrandIds)),
    barcode: params.barcode,
  };
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '15m' });
}

/** Verifica un token de escaneo emitido para el usuario y marca seleccionada. */
export function verifyScanVerificationToken(
  token: string | undefined,
  expected: { userId: string; brandId: number }
): boolean {
  if (!token || !token.trim()) return false;
  try {
    const decoded = jwt.verify(token.trim(), env.jwtSecret) as Partial<ScanVerificationPayload>;
    if (decoded.purpose !== 'beerdex_scan_verified') return false;
    if (decoded.sub !== expected.userId) return false;
    if (!Array.isArray(decoded.allowedBrandIds)) return false;
    return decoded.allowedBrandIds.includes(expected.brandId);
  } catch {
    return false;
  }
}
