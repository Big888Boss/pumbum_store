'use client';

import type { FormEvent, ReactNode } from 'react';
import { useEffect } from 'react';
import Link from 'next/link';
import {
  METRIKA_GOALS,
  trackMetrikaGoal,
  type MetrikaGoal,
  type MetrikaParams,
} from '@/lib/analytics/metrika';

type GoalProps = {
  goal: MetrikaGoal;
  goalParams?: MetrikaParams;
};

type GoalLinkProps = GoalProps & {
  href: string;
  className?: string;
  children: ReactNode;
};

type GoalAnchorProps = GoalLinkProps & {
  target?: string;
  rel?: string;
};

export function MetrikaGoalLink({ href, className, children, goal, goalParams }: GoalLinkProps) {
  return (
    <Link className={className} href={href} onClick={() => trackMetrikaGoal(goal, goalParams)}>
      {children}
    </Link>
  );
}

export function MetrikaGoalAnchor({ href, className, children, target, rel, goal, goalParams }: GoalAnchorProps) {
  return (
    <a
      className={className}
      href={href}
      target={target}
      rel={rel}
      onClick={() => trackMetrikaGoal(goal, goalParams)}
    >
      {children}
    </a>
  );
}

export function MetrikaSearchForm({
  action,
  className,
  location,
  children,
}: {
  action: string;
  className?: string;
  location: string;
  children: ReactNode;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const query = String(data.get('q') ?? '').trim();
    const category = String(data.get('category') ?? '').trim();
    trackMetrikaGoal(METRIKA_GOALS.searchSubmit, {
      location,
      query_length: query.length,
      ...(category ? { category } : {}),
    });
  }

  return (
    <form className={className} action={action} onSubmit={handleSubmit}>
      {children}
    </form>
  );
}

export function MetrikaProductView({ goalParams }: { goalParams: MetrikaParams }) {
  useEffect(() => {
    let sent = false;

    const sendAfterPageview = () => {
      if (sent || window.__pumbumLastMetrikaPageview !== window.location.href) return;
      sent = true;
      trackMetrikaGoal(METRIKA_GOALS.productView, goalParams);
    };

    sendAfterPageview();
    window.addEventListener('pumbum:metrika-pageview', sendAfterPageview);
    return () => window.removeEventListener('pumbum:metrika-pageview', sendAfterPageview);
  }, [goalParams]);

  return null;
}
