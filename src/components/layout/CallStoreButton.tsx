'use client';

import { Phone } from 'lucide-react';
import { MetrikaGoalAnchor } from '@/components/analytics/MetrikaEvents';
import { METRIKA_GOALS } from '@/lib/analytics/metrika';

export function CallStoreButton({ location, label = 'Позвонить и уточнить' }: { location: string; label?: string }) {
  return (
    <MetrikaGoalAnchor
      className="btn btn-primary call-store-button"
      href="tel:+78452477477"
      goal={METRIKA_GOALS.phoneClick}
      goalParams={{ location }}
    >
      <Phone aria-hidden="true" />
      <span>{label}</span>
    </MetrikaGoalAnchor>
  );
}
