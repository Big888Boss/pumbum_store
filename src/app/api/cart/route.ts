import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { ok: false, reason: 'disabled', message: 'Корзина временно отключена. Свяжитесь с магазином по телефону или email.' },
    { status: 410 },
  );
}
