import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";

/** Renders UI inside a MemoryRouter and the real AuthProvider. */
export function renderWithProviders(ui, { route = "/", routes } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>{routes || ui}</AuthProvider>
    </MemoryRouter>
  );
}
