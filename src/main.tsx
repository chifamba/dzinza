import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Assuming global styles
import { Provider } from 'react-redux';
import { store } from './store/store'; // Adjust path if needed
// If using react-router-dom, ensure BrowserRouter is still part of the setup
// For example, it might be wrapping <App /> already, or <App /> handles routing.

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
