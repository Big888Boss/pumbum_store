import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { ok: false, reason: 'disabled', message: 'Онлайн-заявки временно отключены. Свяжитесь с магазином по телефону или email.' },
    { status: 410 },
  );
}
