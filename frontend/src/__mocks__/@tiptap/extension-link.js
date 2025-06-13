// src/__mocks__/@tiptap/extension-link.js
const Link = {
  configure: jest.fn().mockReturnThis(),
  // Add any other properties or methods of Link if they are directly accessed
  name: 'link-mock', // Add a name for easier identification
};

export default Link;
// If it's a class or has other exports, adjust accordingly.
// For now, assuming it's primarily an object with a configure method.
