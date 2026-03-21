import { NextRequest, NextResponse } from 'next/server';
import { parseHtmlToConversation } from '@/lib/parsers';
import { dbClient } from '@/lib/db/client';
import { s3Client } from '@/lib/storage/s3';
import { CreateConversationInput } from '@/lib/db/types';
import { createConversationRecord, getAllConversationRecords } from '@/lib/db/conversations';
import { randomUUID } from 'crypto';
import { loadConfig } from '@/lib/config';
// import { scrapeMetricsStore } from '@/lib/metrics'; // ADDED ON 03/21 p90 p50 and then commented out on 03/21 for better metrics tracking implementation
import { getScrapeMetricsLogSummary, scrapeMetricsStore } from '@/lib/metrics';

let isInitialized = false;
const SKIP_DB_PERSISTENCE = process.env.SKIP_DB_PERSISTENCE === 'true'; // Added 03/20 for local scraping

/**
 * Initialize services if not already initialized
 */
async function ensureInitialized() {
  if (!isInitialized) {
    try {
      const config = loadConfig();
      // await dbClient.initialize(config.database); //Commented OUT on 03/20 for local scraping without DB
      if (!SKIP_DB_PERSISTENCE) { // Commented in on 03/20 for local scraping without DB
        await dbClient.initialize(config.database); // Commented in on 03/20 for local scraping without DB
      } //Commented in on 03/20 for local scraping without DB
      s3Client.initialize(config.s3);
      isInitialized = true;
    } catch (error) {
      // If S3 client is already initialized, that's fine
      if (error instanceof Error && error.message.includes('already initialized')) {
        isInitialized = true;
      } else {
        throw error;
      }
    }
  }
}

const ALLOWED_ORIGIN = '*';

export async function OPTIONS() {
  // Preflight handler
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

/**
 * POST /api/conversation
 *
 * Handles storing a new conversation from HTML input
 *
 * Request body (multipart/form-data):
 * - htmlDoc: File - The HTML document containing the conversation
 * - model: string - The AI model used (e.g., "ChatGPT", "Claude")
 *
 * Response:
 * - 201: { url: string } - The permalink URL for the conversation
 * - 400: { error: string } - Invalid request
 * - 500: { error: string } - Server error
 */
export async function POST(req: NextRequest) {
  const requestStartedAt = performance.now(); // ADDED ON 03/21 p90
  try {
    // Initialize services on first request
    await ensureInitialized();

    const formData = await req.formData();
    const file = formData.get('htmlDoc');
    const model = formData.get('model')?.toString() ?? 'ChatGPT';

    // Validate input
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: '`htmlDoc` must be a file field' }, { status: 400 });
    }

    // Parse the conversation from HTML
    const html = await file.text();
    const parseStartedAt = performance.now(); // ADDED ON 03/21 p50
    const conversation = await parseHtmlToConversation(html, model);
    const parseDurationMs = performance.now() - parseStartedAt; // ADDED ON 03/21 p90 p50

    // Generate a unique ID for the conversation
    const conversationId = randomUUID();

    // Store only the conversation content in S3
    const contentKey = await s3Client.storeConversation(conversationId, conversation.content);

    // Create the database record with metadata
    const dbInput: CreateConversationInput = {
      model: conversation.model,
      scrapedAt: new Date(conversation.scrapedAt),
      sourceHtmlBytes: conversation.sourceHtmlBytes,
      views: 0,
      contentKey,
    };

    //const record = await createConversationRecord(dbInput); COMMENTED OUT on 03/20 for local scraping without DB
    let responseUrl: string; // Added on 03/20 for local scraping without DB START
    let storageMode: 'database+s3' | 's3-only';

    if (SKIP_DB_PERSISTENCE) {
      responseUrl = await s3Client.getSignedReadUrl(contentKey);
      storageMode = 's3-only';
      console.log(`[local-test] Stored conversation ${conversationId} in S3 without DB persistence`);
    } else {
      const record = await createConversationRecord(dbInput); // Commented in on 03/20 for local scraping without DB FINISH

    // Generate the permalink using the database-generated ID
    // const permalink = `${process.env.NEXT_PUBLIC_BASE_URL}/conversation/${record.id}`; // Commented out on 03/20 for local scraping without DB
      responseUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/conversation/${record.id}`; // Commented in on 03/20 for local scraping without DB start
      storageMode = 'database+s3'; // Added on 03/20 for local scraping without DB
    
    } // commented in on 03/20 for local scraping without DB end

    // ADDED ON 03/21 for metrics tracking of scraping events - observe the scrape event with relevant metrics
    const measurement = scrapeMetricsStore.observe({
      model: conversation.model,
      sourceHtmlBytes: conversation.sourceHtmlBytes,
      parseDurationMs,
      totalDurationMs: performance.now() - requestStartedAt,
    });
    const percentileSnapshot = scrapeMetricsStore.snapshot();

    console.info('[scrape-metrics]', {
      model: measurement.model,
      sourceHtmlBytes: measurement.sourceHtmlBytes,
      latestMeasurement: {
        parseDurationMs: measurement.parseDurationMs,
        totalDurationMs: measurement.totalDurationMs,
        recordedAt: measurement.recordedAt,
      },
      percentiles: getScrapeMetricsLogSummary(),
    });
    // ADDED ON 03/21 for metrics tracking of scraping events - observe the scrape event with relevant metrics END

    return NextResponse.json(
      // { url: permalink }, // Commented out on 03/20 for local scraping without DB
      // { url: responseUrl, conversationId, contentKey, storageMode }, // Commented in on 03/20 for local scraping without DB. Later 
      { // 03/21/26 START
        url: responseUrl,
        conversationId,
        contentKey,
        storageMode,
        scrapeMetrics: {
          latestMeasurement: measurement,
          percentileSnapshot,
        },
      }, // Commented in on 03/20 for local scraping without DB // commented out
      {
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        },
      }
    );
  } catch (err) {
    console.error('Error processing conversation:', err);
    return NextResponse.json({ error: 'Internal error, see logs' }, { status: 500 });
  }
}

/**
 * GET /api/conversation
 *
 * Retrieves a list of all conversations with pagination
 *
 * Query parameters:
 * - limit: number (optional) - Maximum number of records to return (default: 50)
 * - offset: number (optional) - Number of records to skip (default: 0)
 *
 * Response:
 * - 200: { conversations: ConversationRecord[] } - Array of conversation records
 * - 400: { error: string } - Invalid request parameters
 * - 500: { error: string } - Server error
 */
export async function GET(req: NextRequest) {
  try {
    // Initialize services on first request
    await ensureInitialized();

    // ADDEDON 03/20 for local scraping without DB - if skipping DB persistence, return empty array with s3-only storage mode
    if (SKIP_DB_PERSISTENCE) {
      return NextResponse.json(
        { conversations: [], storageMode: 's3-only' },
        {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
          },
        }
      );
    }
    // ADDEDON 03/20 for local scraping without DB - if skipping DB persistence, return empty array with s3-only storage mode END

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    // Parse and validate query parameters
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'Invalid limit parameter. Must be between 1 and 100.' }, { status: 400 });
    }

    if (isNaN(offset) || offset < 0) {
      return NextResponse.json({ error: 'Invalid offset parameter. Must be non-negative.' }, { status: 400 });
    }

    // Retrieve conversations from database
    const conversations = await getAllConversationRecords(limit, offset);

    return NextResponse.json(
      { conversations },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        },
      }
    );
  } catch (err) {
    console.error('Error retrieving conversations:', err);
    return NextResponse.json({ error: 'Internal error, see logs' }, { status: 500 });
  }
}
