import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { getCaretClientX } from './visualLineNavigation';

beforeAll(() => GlobalRegistrator.register());
afterAll(() => GlobalRegistrator.unregister());

function makeRect(left: number): DOMRect {
  return {
    left,
    right: left,
    top: 0,
    bottom: 0,
    width: 0,
    height: 0,
    x: left,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect;
}

function stubLeft(el: Element, left: number): void {
  (el as HTMLElement).getBoundingClientRect = () => makeRect(left);
}

function buildPages(markup: string): HTMLElement {
  document.body.innerHTML = `
    <div class="paged-editor__pages">
      <div class="layout-page">${markup}</div>
    </div>
  `;
  return document.body.querySelector<HTMLElement>('.paged-editor__pages')!;
}

describe('getCaretClientX body scope', () => {
  test('prefers the body text span over an HF span with the same PM range', () => {
    const pages = buildPages(`
      <div class="layout-page-header">
        <div class="layout-paragraph">
          <span data-pm-start="1" data-pm-end="5">Header</span>
        </div>
      </div>
      <div class="layout-page-content">
        <div class="layout-paragraph">
          <span data-pm-start="1" data-pm-end="5">Body</span>
        </div>
      </div>
    `);

    const rangeProto = Object.getPrototypeOf(document.createRange());
    const original = rangeProto.getBoundingClientRect;
    rangeProto.getBoundingClientRect = function (this: Range) {
      const text = this.startContainer.textContent ?? '';
      return makeRect(text === 'Body' ? 140 : 860);
    };
    try {
      expect(getCaretClientX(pages, 3)).toBe(140);
    } finally {
      rangeProto.getBoundingClientRect = original;
    }
  });

  test('returns null when only HF text spans match', () => {
    const pages = buildPages(`
      <div class="layout-page-header">
        <div class="layout-paragraph">
          <span data-pm-start="1" data-pm-end="5">Header</span>
        </div>
      </div>
      <div class="layout-page-content">
        <div class="layout-paragraph" data-pm-start="6" data-pm-end="6"></div>
      </div>
    `);

    expect(getCaretClientX(pages, 3)).toBeNull();
  });

  test('prefers the body tab span over an HF tab span with the same PM range', () => {
    const pages = buildPages(`
      <div class="layout-page-header">
        <div class="layout-paragraph">
          <span class="layout-run-tab" data-pm-start="4" data-pm-end="6" id="hf-tab"></span>
        </div>
      </div>
      <div class="layout-page-content">
        <div class="layout-paragraph">
          <span class="layout-run-tab" data-pm-start="4" data-pm-end="6" id="body-tab"></span>
        </div>
      </div>
    `);

    stubLeft(pages.querySelector('#hf-tab')!, 900);
    stubLeft(pages.querySelector('#body-tab')!, 120);

    expect(getCaretClientX(pages, 4)).toBe(120);
  });

  test('prefers the body empty run over an HF empty run with the same PM range', () => {
    const pages = buildPages(`
      <div class="layout-page-header">
        <div class="layout-paragraph" data-pm-start="7" data-pm-end="7">
          <span class="layout-empty-run" id="hf-empty-run"></span>
        </div>
      </div>
      <div class="layout-page-content">
        <div class="layout-paragraph" data-pm-start="7" data-pm-end="7">
          <span class="layout-empty-run" id="body-empty-run"></span>
        </div>
      </div>
    `);

    stubLeft(pages.querySelector('#hf-empty-run')!, 880);
    stubLeft(pages.querySelector('#body-empty-run')!, 96);

    expect(getCaretClientX(pages, 7)).toBe(96);
  });

  test('returns null when only HF empty runs match', () => {
    const pages = buildPages(`
      <div class="layout-page-footer">
        <div class="layout-paragraph" data-pm-start="7" data-pm-end="7">
          <span class="layout-empty-run" id="hf-empty-run"></span>
        </div>
      </div>
      <div class="layout-page-content">
        <div class="layout-paragraph" data-pm-start="9" data-pm-end="9"></div>
      </div>
    `);

    stubLeft(pages.querySelector('#hf-empty-run')!, 880);

    expect(getCaretClientX(pages, 7)).toBeNull();
  });
});
