// src/__mocks__/@tiptap/extension-placeholder.js
const Placeholder = {
  configure: jest.fn(options => ({ // Make configure mockable to check options
    name: 'placeholder-mock',
    ...options, // Spread options to allow checking them in tests
  })),
  name: 'placeholder-mock-base',
};
export default Placeholder;
