/** Loads the YouTube IFrame API once; resolves when `window.YT.Player` exists. */

declare global {
  interface Window {
    YT?: { Player: unknown; PlayerState?: { ENDED: number } };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loadingPromise: Promise<void> | null = null;

export function loadYoutubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();

  if (!loadingPromise) {
    loadingPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        try {
          prev?.();
        } catch {
          /* ignore */
        }
        resolve();
      };

      const existing = document.querySelector<HTMLScriptElement>(
        'script[src*="youtube.com/iframe_api"]',
      );
      if (!existing) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        tag.async = true;
        const first = document.getElementsByTagName("script")[0];
        first?.parentNode?.insertBefore(tag, first);
      } else if (window.YT?.Player) {
        resolve();
      } else {
        const start = Date.now();
        const poll = window.setInterval(() => {
          if (window.YT?.Player) {
            window.clearInterval(poll);
            resolve();
            return;
          }
          if (Date.now() - start > 15000) {
            window.clearInterval(poll);
            resolve();
          }
        }, 32);
      }
    });
  }

  return loadingPromise;
}
