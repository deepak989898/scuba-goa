/**
 * Best-effort device model from User-Agent (no external library).
 * Modern Chrome often hides the model (e.g. "K" on Android) — we label that clearly.
 */

function cleanModel(raw: string): string {
  return raw.replace(/_/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

/** Human-readable device model name when detectable from UA. */
export function deviceModelFromUserAgent(ua: string): string {
  const u = ua.trim();
  if (!u) return "";

  // Apple — often no specific model in reduced UA
  const iphone = u.match(/\biPhone(?:\s*OS)?/i);
  if (iphone) {
    // iPhone15,2 style rare in full UA
    const id = u.match(/\biPhone(\d{1,2},\d)\b/);
    if (id) return `iPhone (${id[1]})`;
    return "iPhone";
  }
  if (/\biPad\b/i.test(u)) return "iPad";
  if (/\biPod\b/i.test(u)) return "iPod touch";

  // Samsung
  const samsung = u.match(/\b(SM-[A-Z0-9]+)\b/i);
  if (samsung) return cleanModel(`Samsung ${samsung[1]}`);

  // Google Pixel
  const pixel = u.match(/\b(Pixel(?:\s+\d+(?:\s+(?:Pro|a|XL))?)?)\b/i);
  if (pixel) return cleanModel(`Google ${pixel[1]}`);

  // OnePlus
  const oneplus = u.match(/\b(OnePlus\s*[A-Z0-9]+)\b/i);
  if (oneplus) return cleanModel(oneplus[1]);

  // Xiaomi / Redmi / POCO
  const redmi = u.match(/\b(Redmi\s+[\w\s]+?)(?:\s+Build|\))/i);
  if (redmi) return cleanModel(redmi[1]);
  const mi = u.match(/\b(Mi\s+[\w\s]+?)(?:\s+Build|\))/i);
  if (mi) return cleanModel(mi[1]);
  const poco = u.match(/\b(POCO\s+[\w\s]+?)(?:\s+Build|\))/i);
  if (poco) return cleanModel(poco[1]);

  // Motorola
  const moto = u.match(/\b(moto\s+[\w\s]+?)(?:\s+Build|\))/i);
  if (moto) return cleanModel(moto[1]);

  // OPPO / Realme / Vivo
  const oppo = u.match(/\b(CPH\d{4}|OPPO\s+[\w\s]+?)(?:\s+Build|\))/i);
  if (oppo) return cleanModel(oppo[1].startsWith("CPH") ? `OPPO ${oppo[1]}` : oppo[1]);
  const realme = u.match(/\b(RMX\d{4}|Realme\s+[\w\s]+?)(?:\s+Build|\))/i);
  if (realme) return cleanModel(realme[1].startsWith("RMX") ? `Realme ${realme[1]}` : realme[1]);
  const vivo = u.match(/\b(V\d{4}[A-Z]?|vivo\s+[\w\s]+?)(?:\s+Build|\))/i);
  if (vivo) return cleanModel(vivo[1]);

  // Huawei / Honor
  const huawei = u.match(/\b(HUAWEI[\w-]+|Honor\s+[\w\s]+?)(?:\s+Build|\))/i);
  if (huawei) return cleanModel(huawei[1]);

  // Windows / Mac desktops
  if (/Windows NT/i.test(u)) {
    if (/Touch/i.test(u)) return "Windows tablet / touch PC";
    return "Windows PC";
  }
  if (/Macintosh|Mac OS X/i.test(u)) return "Mac";

  // Android with model in Build string: Android 12; Model Name Build/
  const androidBuild = u.match(/Android\s+[\d.]+;\s*([^;)]+?)\s+Build\//i);
  if (androidBuild) {
    const model = cleanModel(androidBuild[1]);
    if (model && model.length > 1 && !/^K$/i.test(model) && !/Linux/i.test(model)) {
      return model;
    }
  }

  // Chrome privacy-reduced Android UA: (Linux; Android 10; K)
  if (/Android/i.test(u) && /;\s*K\)\s+AppleWebKit/i.test(u)) {
    return "Android phone (model hidden by browser)";
  }
  if (/Android/i.test(u) && !/Mobile/i.test(u)) return "Android tablet";
  if (/Android/i.test(u)) return "Android phone";

  return "";
}
