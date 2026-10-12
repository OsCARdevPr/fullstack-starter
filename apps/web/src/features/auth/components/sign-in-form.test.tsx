import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authClient } from "@/lib/auth-client";
import { SignInForm } from "./sign-in-form";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/lib/auth-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-client")>()),
  authClient: { signIn: { email: vi.fn() } },
}));

const signInEmail = vi.mocked(authClient.signIn.email);

function renderForm(onSuccess = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <SignInForm onSuccess={onSuccess} />
    </QueryClientProvider>,
  );
  return { onSuccess };
}

async function submit(email: string, password: string) {
  const user = userEvent.setup();
  if (email) await user.type(screen.getByLabelText("Email"), email);
  if (password) await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("SignInForm", () => {
  beforeEach(() => {
    signInEmail.mockReset();
    vi.mocked(toast.error).mockClear();
  });

  it("shows validation errors without calling the server", async () => {
    renderForm();

    await submit("", "");

    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it("signs in and calls onSuccess", async () => {
    signInEmail.mockResolvedValue({ data: {}, error: null } as never);
    const { onSuccess } = renderForm();

    await submit("ada@example.com", "correct horse battery");

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(signInEmail).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "correct horse battery",
    });
  });

  it("shows invalid credentials as a form-level error", async () => {
    signInEmail.mockResolvedValue({
      data: null,
      error: { status: 401, statusText: "UNAUTHORIZED", message: "Invalid email or password" },
    } as never);
    const { onSuccess } = renderForm();

    await submit("ada@example.com", "wrong password");

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
    expect(onSuccess).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows rate limiting as a toast", async () => {
    signInEmail.mockResolvedValue({
      data: null,
      error: { status: 429, statusText: "TOO_MANY_REQUESTS", message: "Too many requests." },
    } as never);
    renderForm();

    await submit("ada@example.com", "any password");

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Too many requests."));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
