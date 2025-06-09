import React from 'react';

describe('Minimal React Test', () => {
  it('should allow basic JSX', () => {
    const element = <div>Test</div>;
    expect(element).toBeDefined();
  });
});
