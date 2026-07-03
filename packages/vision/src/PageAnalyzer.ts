import type { PageContext } from '@tendo/core';

export interface PageSummary {
  type: string;
  elements: string[];
  description: string;
}

export class PageAnalyzer {
  analyzePageState(context: PageContext): PageSummary {
    const elements = context.visibleElements;
    const elementLower = elements.map(e => e.toLowerCase());

    if (this.detectLoginForm(elementLower)) {
      return {
        type: 'login-form',
        elements: this.extractRelevantElements(elements, ['input type=text', 'input type=password', 'button']),
        description: 'Login form detected with username and password fields',
      };
    }

    if (this.detectSearchForm(elementLower)) {
      return {
        type: 'search-form',
        elements: this.extractRelevantElements(elements, ['input type=text', 'button']),
        description: 'Search form detected with input field and submit button',
      };
    }

    if (this.detectProductPage(elementLower)) {
      return {
        type: 'product-page',
        elements: this.extractRelevantElements(elements, ['button', 'link']),
        description: 'Product page detected with purchase/cart options',
      };
    }

    return {
      type: 'generic',
      elements: elements.slice(0, 10),
      description: `Generic page with ${elements.length} interactive elements`,
    };
  }

  private detectLoginForm(elementLower: string[]): boolean {
    const hasPassword = elementLower.some(e => e.includes('input type=password'));
    const hasEmailOrUsername = elementLower.some(e =>
      e.includes('input type=') && (e.includes('email') || e.includes('username') || e.includes('user'))
    );
    const hasSubmitButton = elementLower.some(e => e.includes('button') && e.includes('submit'));

    return hasPassword && (hasEmailOrUsername || hasSubmitButton);
  }

  private detectSearchForm(elementLower: string[]): boolean {
    const hasSearchInput = elementLower.some(e =>
      e.includes('input') && (e.includes('search') || e.includes('query'))
    );
    const hasButton = elementLower.some(e => e.includes('button') || e.includes('search'));

    return hasSearchInput && hasButton;
  }

  private detectProductPage(elementLower: string[]): boolean {
    const hasAddToCart = elementLower.some(e =>
      (e.includes('button') || e.includes('link')) &&
      (e.includes('cart') || e.includes('buy') || e.includes('add'))
    );
    const hasPrice = elementLower.some(e => e.includes('$') || e.includes('price'));

    return hasAddToCart || (hasPrice && hasAddToCart);
  }

  private extractRelevantElements(elements: string[], patterns: string[]): string[] {
    return elements.filter(e => {
      const eLower = e.toLowerCase();
      return patterns.some(p => eLower.includes(p.toLowerCase()));
    }).slice(0, 5);
  }
}
