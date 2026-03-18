import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { event } = await request.json();

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 80,
      system:
        'คุณเป็นผู้บรรยายเกม Grid Geography Game คอมเมนต์สั้น กระชับ ไม่เกิน 20 คำ ใช้ภาษาไทย',
      messages: [{ role: 'user', content: event }],
    });

    const text =
      message.content[0].type === 'text' ? message.content[0].text : '';
    return NextResponse.json({ comment: text });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { comment: '', error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json({ comment: '', error: 'Unknown error' }, { status: 500 });
  }
}
