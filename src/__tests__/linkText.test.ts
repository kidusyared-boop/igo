import { describe, expect, it } from 'vitest';
import { linkParts } from '../components/ui/LinkText';
import { ETHIOPIA as ethiopia } from '../data/ethiopia/ethiopia';

const links = (text: string) => linkParts(text).flatMap((p) => ('href' in p ? [p.href] : []));
const joined = (text: string) => linkParts(text).map((p) => p.text).join('');

describe('links in plan text', () => {
  it('links a web address without the full stop after it', () => {
    const text = 'Most visitors need an e-Visa. Official site: https://www.evisa.gov.et/.';
    expect(links(text)).toEqual(['https://www.evisa.gov.et/']);
    expect(joined(text)).toBe(text);
  });

  it('dials each emergency number', () => {
    expect(links(ethiopia.emergency)).toEqual(['tel:991', 'tel:907', 'tel:939']);
    expect(joined(ethiopia.emergency)).toBe(ethiopia.emergency);
    expect(links('Tourist police 1155, police 191, ambulance 1669')).toEqual(['tel:1155', 'tel:191', 'tel:1669']);
    expect(links('Police 110, ambulance and fire 119')).toEqual(['tel:110', 'tel:119']);
  });

  it('leaves other numbers alone', () => {
    expect(links('5 to 10 percent in restaurants. Notes printed after 2013.')).toEqual([]);
    expect(links('Locals count hours from 6 am, so 2 means 08:00.')).toEqual([]);
  });
});
