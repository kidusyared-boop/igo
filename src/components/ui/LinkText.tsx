import type { ReactNode } from 'react';

// A web address, or a number that follows an emergency service's name ("Police 991",
// "ambulance and fire 119"). No lookbehind: older iPhones cannot parse it.
const PATTERN = /(https?:\/\/[^\s]+?)(?=[.,;:)]?(?:\s|$))|\b(police|ambulance|fire|emergency|hotline)\b([^0-9.,;]{0,20}?)(\+?\d[\d -]{1,13}\d)\b/gi;

export type TextPart = { text: string } | { text: string; href: string };

/** Splits text into plain pieces and pieces to link: web addresses open, emergency numbers dial. */
export function linkParts(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(PATTERN)) {
    const [whole, url, service, between, number] = m;
    const start = m.index;
    if (url) {
      if (start > last) parts.push({ text: text.slice(last, start) });
      parts.push({ text: url, href: url });
    } else if (service && number) {
      parts.push({ text: text.slice(last, start) + service + (between ?? '') });
      parts.push({ text: number, href: `tel:${number.replace(/[^\d+]/g, '')}` });
    }
    last = start + whole.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts.filter((p) => p.text);
}

/**
 * Text with its web addresses and emergency numbers as links. In the phone apps a tapped
 * link leaves the app: the browser opens the site and the dialer gets the number.
 */
export function LinkText({ text }: { text: string }): ReactNode {
  return linkParts(text).map((p, i) =>
    'href' in p ? (
      <a key={i} href={p.href} {...(p.href.startsWith('tel:') ? {} : { target: '_blank', rel: 'noreferrer' })}>{p.text}</a>
    ) : (
      p.text
    ),
  );
}
