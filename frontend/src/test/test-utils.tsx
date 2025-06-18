// src/test/test-utils.tsx
import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

// Create a simplified mock store with empty reducers
const createTestStore = () =>
  configureStore({
    reducer: {
      auth: (
        state = { user: null, isAdmin: false, isAuthenticated: false },
        _action
      ) => state,
      genealogy: (state = { families: [], currentFamily: null }, _action) =>
        state,
      ui: (state = { theme: "light", loading: {} }, _action) => state,
    },
  });

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  initialRoute?: string;
  store?: ReturnType<typeof createTestStore>;
}

/**
 * Custom render function that wraps components with necessary providers
 * for testing (Router, Redux, etc.)
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    initialRoute = "/",
    store = createTestStore(),
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={[initialRoute]}>{children}</MemoryRouter>
      </Provider>
    );
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { renderWithProviders as render };
