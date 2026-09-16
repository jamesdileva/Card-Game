import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Login from "./Login";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(handler) {
  vi.stubGlobal("fetch", vi.fn(handler));
}

function setup() {
  const onLogin = vi.fn();
  render(<Login onLogin={onLogin} />);
  return { onLogin };
}

function fillCredentials(username, password) {
  fireEvent.change(screen.getByPlaceholderText("Username"), {
    target: { value: username }
  });
  fireEvent.change(screen.getByPlaceholderText("Password"), {
    target: { value: password }
  });
}

describe("Login failure UX", () => {
  it("shows the server error inline and keeps inputs usable for retry", async () => {
    stubFetch(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: "Invalid login" })
    }));
    setup();
    fillCredentials("james", "wrongpass");

    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid login");

    // Regression: the old blocking alert() stole window focus in the desktop
    // app, leaving the fields apparently untypeable. Inputs must stay live.
    const usernameInput = screen.getByPlaceholderText("Username");
    const passwordInput = screen.getByPlaceholderText("Password");
    expect(usernameInput).toBeEnabled();
    expect(passwordInput).toBeEnabled();
    fireEvent.change(passwordInput, { target: { value: "123" } });
    expect(passwordInput).toHaveValue("123");
  });

  it("lets a corrected retry go through after a failure", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: "Invalid login" })
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { onLogin } = setup();
    fillCredentials("james", "wrongpass");

    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    await screen.findByRole("alert");

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: "logged_in", loginReward: 0, loginStreak: 1 })
    });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    // onLogin fires after the successful retry (assert via polling-free find)
    await vi.waitFor(() => expect(onLogin).toHaveBeenCalledTimes(1));
  });

  it("shows register rejections inline instead of claiming success", async () => {
    stubFetch(async () => ({
      ok: false,
      status: 400,
      json: async () => ({
        error: "Invalid input (username: 3-20 chars letters/numbers/_; password: 4-100 chars)"
      })
    }));
    const { onLogin } = setup();
    fillCredentials("james", "123");

    fireEvent.click(screen.getByRole("button", { name: "Register" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid input");
    expect(onLogin).not.toHaveBeenCalled();
  });

  it("shows a visible message when the request itself fails", async () => {
    stubFetch(async () => {
      throw new Error("network down");
    });
    setup();
    fillCredentials("james", "123");

    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Connection error");
  });
});
