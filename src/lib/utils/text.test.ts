import { describe, it, expect } from 'vitest'
import { toHalfWidth, tryCalculateMath } from './text'

describe('toHalfWidth', () => {
  it('converts full-width digits', () => {
    expect(toHalfWidth('０１２３４５６７８９')).toBe('0123456789')
  })

  it('converts full-width uppercase', () => {
    expect(toHalfWidth('ＡＢＣ')).toBe('ABC')
  })

  it('converts full-width lowercase', () => {
    expect(toHalfWidth('ａｂｃ')).toBe('abc')
  })

  it('converts full-width operators', () => {
    expect(toHalfWidth('＋－×÷')).toBe('+-*/')
  })

  it('converts full-width brackets and percent', () => {
    expect(toHalfWidth('（１＋２）％')).toBe('(1+2)%')
  })

  it('preserves CJK punctuation', () => {
    expect(toHalfWidth('你好，世界。')).toBe('你好，世界。')
  })

  it('handles empty/falsy input', () => {
    expect(toHalfWidth('')).toBe('')
    expect(toHalfWidth(null as never)).toBe(null)
  })
})

describe('tryCalculateMath', () => {
  it('calculates simple addition', () => {
    expect(tryCalculateMath('1+2')).toBe('3')
  })

  it('calculates multiplication', () => {
    expect(tryCalculateMath('3*4')).toBe('12')
  })

  it('calculates complex expression', () => {
    expect(tryCalculateMath('(10+5)*2')).toBe('30')
  })

  it('handles full-width input', () => {
    expect(tryCalculateMath('１＋２')).toBe('3')
  })

  it('returns original for plain text', () => {
    expect(tryCalculateMath('hello')).toBe('hello')
  })

  it('returns original for single number', () => {
    expect(tryCalculateMath('42')).toBe('42')
  })

  it('handles empty/falsy', () => {
    expect(tryCalculateMath('')).toBe('')
    expect(tryCalculateMath(null as never)).toBe(null)
  })

  it('handles decimal results', () => {
    expect(tryCalculateMath('10/3')).toBe('3.33')
  })

  it('handles percentage', () => {
    expect(tryCalculateMath('200*10%')).toBe('20')
  })
})
