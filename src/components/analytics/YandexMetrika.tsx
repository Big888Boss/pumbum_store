/* eslint-disable @next/next/no-img-element */
import { Suspense } from 'react';
import { MetrikaRouteTracker } from '@/components/analytics/MetrikaRouteTracker';

export function YandexMetrika({ nonce }: { nonce?: string }) {
  const counterId = Number(process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID);
  if (!Number.isSafeInteger(counterId) || counterId <= 0) return null;

  return (
    <>
      <script
        id="yandex-metrika"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: `
          (function(m,e,t,r,i){
            var initialized = false;
            function initializeMetrika() {
              if (initialized) return;
              initialized = true;
              m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
              m[i].l=1*new Date();
              for (var j = 0; j < document.scripts.length; j++) {
                if (document.scripts[j].src === r) return;
              }
              var k=e.createElement(t),a=e.getElementsByTagName(t)[0];
              k.async=1,k.src=r,a.parentNode.insertBefore(k,a);
              m[i](${counterId}, 'init', {
                defer: true,
                clickmap: true,
                trackLinks: true,
                accurateTrackBounce: true,
                webvisor: true
              });
              window.__pumbumMetrikaInitialized = true;
              var pendingCommands = Array.isArray(window.__pumbumMetrikaPending)
                ? window.__pumbumMetrikaPending.slice(0, 50)
                : [];
              window.__pumbumMetrikaPending = [];
              for (var commandIndex = 0; commandIndex < pendingCommands.length; commandIndex++) {
                var command = pendingCommands[commandIndex];
                if (!command || !Array.isArray(command.args)) continue;
                if (command.method !== 'hit' && command.method !== 'reachGoal') continue;
                m[i](${counterId}, command.method, ...command.args);
              }
              window.dispatchEvent(new Event('pumbum:metrika-ready'));
            }
            function scheduleMetrika() { window.setTimeout(initializeMetrika, 4000); }
            if (document.readyState === 'complete') scheduleMetrika();
            else window.addEventListener('load', scheduleMetrika, { once: true });
          })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
        `,
        }}
      />
      <Suspense fallback={null}>
        <MetrikaRouteTracker />
      </Suspense>
      <noscript>
        <div>
          <img
            src={`https://mc.yandex.ru/watch/${counterId}`}
            className="metrika-noscript"
            width="1"
            height="1"
            alt=""
          />
        </div>
      </noscript>
    </>
  );
}
