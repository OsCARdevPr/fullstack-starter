import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeProvider, useTheme } from "./theme-provider";

const wrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

afterEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
});

describe("ThemeProvider", () => {
  it("follows the system preference by default", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe("system");
    expect(result.current.resolvedTheme).toBe("light");
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("applies and remembers the chosen theme", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => result.current.setTheme("dark"));

    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("restores the saved theme", () => {
    localStorage.setItem("theme", "dark");

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe("dark");
  });
});
