import { expect, test } from 'bun:test';
import { refreshTarget } from '../src/refresh';

test('refresh targets resolve quotes, case, relative URLs and base URLs', () => {
  const base='https://example.com/nested/start';
  expect(refreshTarget(" 1; uRl = '../next?x=1' ",base)).toEqual({url:'https://example.com/next?x=1',delay:1});
  expect(refreshTarget('0; URL="https://other.example.com/"',base)).toEqual({url:'https://other.example.com/',delay:0});
  expect(refreshTarget('0; /next',base)?.url).toBe('https://example.com/next');
  expect(refreshTarget('2',base)).toEqual({url:base,delay:2});
});
test('invalid and non-web refresh targets cannot become redirect evidence', () => {
  for (const value of ['', 'invalid', '-1;url=/next', '0;url=javascript:alert(1)', '0;url=data:text/html,test']) {
    expect(refreshTarget(value,'https://example.com/')).toBeUndefined();
  }
});
