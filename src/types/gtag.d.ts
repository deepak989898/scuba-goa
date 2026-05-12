/** Google tag (gtag.js) + Microsoft Clarity queue (MarketingScripts) + Meta Pixel */
interface Window {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  /** https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-api */
  clarity?: (...args: unknown[]) => void;
  /** Meta Pixel (`fbevents.js`) */
  fbq?: (...args: unknown[]) => void;
}
