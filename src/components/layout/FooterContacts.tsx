'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Mail, MapPin, Phone } from 'lucide-react';
import { MetrikaGoalAnchor } from '@/components/analytics/MetrikaEvents';
import { METRIKA_GOALS, trackMetrikaGoal } from '@/lib/analytics/metrika';

export function FooterContacts({
  phone,
  email,
  address,
  mapHref,
}: {
  phone: string;
  email?: string;
  address: string;
  mapHref?: string;
}) {
  const [copied, setCopied] = useState(false);
  const phoneHref = `tel:${phone.replace(/[^+\d]/g, '')}`;

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copyEmail() {
    if (!email) return;
    let didCopy = false;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(email);
        didCopy = true;
      }
    } catch {
      // Fall back to a temporary selection for browsers without clipboard permission.
    }
    if (!didCopy) {
      const field = document.createElement('textarea');
      field.value = email;
      field.setAttribute('readonly', '');
      field.className = 'clipboard-proxy';
      document.body.append(field);
      field.select();
      didCopy = document.execCommand('copy');
      field.remove();
    }
    if (!didCopy) return;
    trackMetrikaGoal(METRIKA_GOALS.emailClick, { location: 'footer_copy' });
    setCopied(true);
  }

  return (
    <address className="footer-contacts">
      <MetrikaGoalAnchor
        className="footer-contact-link"
        href={phoneHref}
        goal={METRIKA_GOALS.phoneClick}
        goalParams={{ location: 'footer' }}
      >
        <Phone aria-hidden="true" />
        <span><small>Позвонить</small><strong>{phone}</strong></span>
      </MetrikaGoalAnchor>
      {email ? (
        <div className="footer-email-actions">
          <MetrikaGoalAnchor
            className="footer-contact-link"
            href={`mailto:${email}`}
            goal={METRIKA_GOALS.emailClick}
            goalParams={{ location: 'footer' }}
          >
            <Mail aria-hidden="true" />
            <span><small>Написать на почту</small><strong>{email}</strong></span>
          </MetrikaGoalAnchor>
          <button className="footer-copy-button" type="button" onClick={copyEmail} aria-label={`Скопировать адрес электронной почты ${email}`}>
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            <span aria-live="polite">{copied ? 'Скопировано' : 'Копировать'}</span>
          </button>
        </div>
      ) : null}
      {mapHref ? (
        <a className="footer-contact-link" href={mapHref} target="_blank" rel="noreferrer">
          <MapPin aria-hidden="true" />
          <span><small>Открыть на карте</small><strong>{address}</strong></span>
        </a>
      ) : <span className="footer-contact-link"><MapPin aria-hidden="true" /><span><small>Адрес магазина</small><strong>{address}</strong></span></span>}
    </address>
  );
}
