import { NextResponse } from 'next/server';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const WEBHOOK_URL = 'https://megachad.xyz/api/telegram';

/**
 * GET /api/telegram/setup
 *
 * One-time endpoint to register the Telegram webhook.
 * Sets the bot's webhook URL to https://megachad.xyz/api/telegram
 */
export async function GET() {
  if (!BOT_TOKEN) {
    return NextResponse.json(
      { error: 'TELEGRAM_BOT_TOKEN not configured' },
      { status: 500 },
    );
  }

  try {
    // Set webhook
    const setRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: WEBHOOK_URL,
          allowed_updates: ['message'],
          drop_pending_updates: true,
        }),
      },
    );

    const setData = await setRes.json();

    // Verify webhook info
    const infoRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`,
    );
    const infoData = await infoRes.json();

    return NextResponse.json({
      setWebhook: setData,
      webhookInfo: infoData.result,
    });
  } catch (err) {
    console.error('[Telegram Setup] Failed:', err);
    return NextResponse.json(
      { error: 'Failed to set webhook', details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
