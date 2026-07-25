export const METRIKA_GOALS = {
  searchSubmit: 'search_submit',
  phoneClick: 'click_phone',
  emailClick: 'click_email',
  productView: 'view_product',
  orderClick: 'click_order',
} as const;

export type MetrikaGoal = (typeof METRIKA_GOALS)[keyof typeof METRIKA_GOALS];
export type MetrikaParams = Record<string, string | number | boolean>;

type MetrikaCommand = {
  method: 'hit' | 'reachGoal';
  args: unknown[];
};

type MetrikaFunction = (...args: unknown[]) => void;

declare global {
  interface Window {
    ym?: MetrikaFunction;
    __pumbumMetrikaInitialized?: boolean;
    __pumbumMetrikaPending?: MetrikaCommand[];
    __pumbumLastMetrikaPageview?: string;
  }
}

function getCounterId(): number | undefined {
  const value = Number(process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID);
  return Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

function sendOrQueueMetrikaCommand(command: MetrikaCommand): boolean {
  if (typeof window === 'undefined') return false;
  const counterId = getCounterId();
  if (!counterId) return false;

  if (window.__pumbumMetrikaInitialized && typeof window.ym === 'function') {
    window.ym(counterId, command.method, ...command.args);
    return true;
  }

  window.__pumbumMetrikaPending = window.__pumbumMetrikaPending ?? [];
  if (window.__pumbumMetrikaPending.length >= 50) return false;
  window.__pumbumMetrikaPending.push(command);
  return true;
}

export function trackMetrikaGoal(goal: MetrikaGoal, params: MetrikaParams = {}): boolean {
  return sendOrQueueMetrikaCommand({ method: 'reachGoal', args: [goal, params] });
}

export function trackMetrikaPageview(
  url: string,
  options: { title: string; referer?: string },
): boolean {
  return sendOrQueueMetrikaCommand({ method: 'hit', args: [url, options] });
}
