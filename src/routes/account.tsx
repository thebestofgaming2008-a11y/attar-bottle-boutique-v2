import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState, type FormEvent } from "react";
import { LogOut, MapPin, Package, UserRound } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { StoreShell, SiteFooter } from "@/components/store/StoreShell";
import { useAuth } from "@/contexts/AuthContext";
import { inr } from "@/lib/products";
import { SearchSelect } from "@/components/ui/search-select";
import { COUNTRY_OPTIONS } from "@/lib/countries";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [{ title: "Your account — BADR" }, { name: "robots", content: "noindex" }],
  }),
  component: AccountPage,
});

function AccountPage() {
  const auth = useAuth();
  const orders = useQuery(api.orders.listMine, auth.user ? {} : "skip");
  const addresses = useQuery(api.addresses.listMine, auth.user ? {} : "skip");
  const createAddress = useMutation(api.addresses.create);
  const removeAddress = useMutation(api.addresses.remove);
  const setDefaultAddress = useMutation(api.addresses.setDefault);
  const updateProfile = useMutation(api.users.updateProfile);
  const [mode, setMode] = useState<"signIn" | "signUp" | "reset" | "resetCode">("signIn");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    code: "",
    newPassword: "",
  });
  const [profileForm, setProfileForm] = useState({ fullName: "", phone: "" });
  const [address, setAddress] = useState({
    full_name: "",
    phone: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "India",
  });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.profile) return;
    setProfileForm({
      fullName: auth.profile.full_name || "",
      phone: auth.profile.phone || "",
    });
  }, [auth.profile]);

  async function submitAuth(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (mode === "reset") {
      const result = await auth.requestPasswordReset(authForm.email);
      if (!result.error) {
        setMode("resetCode");
        setMessage("Check your email for the six-digit reset code.");
      } else setMessage(result.error.message);
      return;
    }
    if (mode === "resetCode") {
      const result = await auth.resetPassword(authForm.email, authForm.code, authForm.newPassword);
      if (!result.error) setMessage("Password changed. You are now signed in.");
      else setMessage(result.error.message);
      return;
    }
    const result =
      mode === "signIn"
        ? await auth.signIn(authForm.email, authForm.password)
        : await auth.signUp(authForm.email, authForm.password, authForm.name);
    setMessage(result.error?.message ?? null);
  }

  async function submitProfile(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    try {
      await updateProfile({
        full_name: profileForm.fullName.trim() || null,
        phone: profileForm.phone.trim() || null,
      });
      setMessage("Account details saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save account details.");
    }
  }

  async function submitAddress(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    try {
      await createAddress({
        payload: { ...address, type: "shipping", is_default: !addresses?.length },
      });
      setAddress({
        full_name: "",
        phone: "",
        address_line_1: "",
        address_line_2: "",
        city: "",
        state: "",
        postal_code: "",
        country: "India",
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save address.");
    }
  }

  return (
    <StoreShell>
      <main className="min-h-screen bg-[#f5f2ec] px-4 pb-24 pt-32 sm:px-6">
        <div className="mx-auto max-w-6xl">
          {!auth.user ? (
            <div className="mx-auto max-w-md bg-background p-6 shadow-sm sm:p-9">
              <UserRound className="h-8 w-8" />
              <h1 className="mt-5 font-display text-5xl">
                {mode === "signIn"
                  ? "Welcome back."
                  : mode === "signUp"
                    ? "Create your account."
                    : "Reset your password."}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Accounts are optional. Guest checkout always remains available.
              </p>
              <form onSubmit={submitAuth} className="mt-7 grid gap-4">
                {mode === "signUp" ? (
                  <AccountInput
                    label="Full name"
                    value={authForm.name}
                    onChange={(name) => setAuthForm((form) => ({ ...form, name }))}
                  />
                ) : null}
                <AccountInput
                  label="Email"
                  type="email"
                  value={authForm.email}
                  onChange={(email) => setAuthForm((form) => ({ ...form, email }))}
                />
                {mode === "signIn" || mode === "signUp" ? (
                  <AccountInput
                    label="Password"
                    type="password"
                    value={authForm.password}
                    onChange={(password) => setAuthForm((form) => ({ ...form, password }))}
                  />
                ) : null}
                {mode === "signUp" ? (
                  <p className="text-xs leading-5 text-muted-foreground">
                    Use at least 10 characters with upper-case, lower-case, and a number.
                  </p>
                ) : null}
                {mode === "resetCode" ? (
                  <>
                    <AccountInput
                      label="Six-digit code"
                      inputMode="numeric"
                      value={authForm.code}
                      onChange={(code) => setAuthForm((form) => ({ ...form, code }))}
                    />
                    <AccountInput
                      label="New password"
                      type="password"
                      value={authForm.newPassword}
                      onChange={(newPassword) => setAuthForm((form) => ({ ...form, newPassword }))}
                    />
                  </>
                ) : null}
                {message ? (
                  <p role="alert" className="text-sm text-red-700">
                    {message}
                  </p>
                ) : null}
                <button className="bg-foreground py-4 text-xs font-semibold uppercase tracking-[0.18em] text-background">
                  {mode === "signIn"
                    ? "Sign in"
                    : mode === "signUp"
                      ? "Create account"
                      : mode === "reset"
                        ? "Send reset code"
                        : "Change password"}
                </button>
              </form>
              <div className="mt-5 grid gap-3 text-center text-xs">
                <button
                  onClick={() => {
                    setMode(mode === "signUp" ? "signIn" : "signUp");
                    setMessage(null);
                  }}
                  className="underline underline-offset-4"
                >
                  {mode === "signUp"
                    ? "Already have an account? Sign in"
                    : "New to BADR? Create an account"}
                </button>
                <button
                  onClick={() => {
                    setMode(mode === "reset" || mode === "resetCode" ? "signIn" : "reset");
                    setMessage(null);
                  }}
                  className="underline underline-offset-4"
                >
                  {mode === "reset" || mode === "resetCode"
                    ? "Back to sign in"
                    : "Forgot your password?"}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-end justify-between gap-5">
                <div>
                  <p className="eyebrow">Your account</p>
                  <h1 className="mt-4 font-display text-5xl sm:text-7xl">Assalamu alaikum.</h1>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {auth.profile?.full_name || auth.user.email}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/wishlist"
                    className="border border-foreground px-4 py-3 text-xs font-semibold uppercase tracking-[0.13em]"
                  >
                    Wishlist
                  </Link>
                  {auth.isAdmin ? (
                    <Link
                      to="/admin"
                      className="bg-foreground px-4 py-3 text-xs font-semibold uppercase tracking-[0.13em] text-background"
                    >
                      Admin
                    </Link>
                  ) : null}
                  <button
                    onClick={() => void auth.signOut()}
                    className="flex items-center gap-2 border border-foreground px-4 py-3 text-xs font-semibold uppercase tracking-[0.13em]"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign out
                  </button>
                </div>
              </div>

              <div className="mt-10 grid gap-6 lg:grid-cols-2">
                <section className="bg-background p-5 sm:p-7 lg:col-span-2">
                  <div className="flex items-center gap-3">
                    <UserRound className="h-5 w-5" />
                    <h2 className="font-display text-3xl">Account details</h2>
                  </div>
                  <form onSubmit={submitProfile} className="mt-5 grid gap-3 sm:grid-cols-2">
                    <AccountInput
                      label="Full name"
                      value={profileForm.fullName}
                      onChange={(fullName) => setProfileForm((item) => ({ ...item, fullName }))}
                    />
                    <AccountInput
                      label="Phone"
                      type="tel"
                      value={profileForm.phone}
                      onChange={(phone) => setProfileForm((item) => ({ ...item, phone }))}
                    />
                    <button className="bg-foreground py-3 text-xs font-semibold uppercase tracking-[0.15em] text-background sm:col-span-2">
                      Save account details
                    </button>
                  </form>
                </section>
                <section className="bg-background p-5 sm:p-7">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5" />
                    <h2 className="font-display text-3xl">Orders</h2>
                  </div>
                  <div className="mt-5 grid gap-3">
                    {orders === undefined ? (
                      <p className="text-sm text-muted-foreground">Loading orders…</p>
                    ) : orders.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No orders yet.</p>
                    ) : (
                      orders.map((order) => (
                        <details key={order.id} className="border border-foreground/15 p-4">
                          <summary className="cursor-pointer list-none text-sm font-semibold">
                            {order.order_number} · {inr(order.total_inr ?? order.total)}{" "}
                            <span className="float-right text-xs uppercase text-muted-foreground">
                              {order.status}
                            </span>
                          </summary>
                          <ul className="mt-4 grid gap-3 border-t border-foreground/10 pt-4">
                            {(order.items || []).map((item: any) => (
                              <li
                                key={item.id}
                                className="grid grid-cols-[48px_minmax(0,1fr)_auto] gap-3 text-sm"
                              >
                                {item.product_image_url ? (
                                  <img
                                    src={item.product_image_url}
                                    alt=""
                                    className="h-12 w-12 object-contain"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                ) : (
                                  <div className="h-12 w-12 bg-secondary" />
                                )}
                                <span>
                                  {item.product_name}
                                  <small className="mt-1 block text-muted-foreground">
                                    Qty {item.quantity}
                                    {item.selected_size ? ` · ${item.selected_size}` : ""}
                                  </small>
                                </span>
                                <span>{inr(item.subtotal)}</span>
                              </li>
                            ))}
                          </ul>
                          <Link
                            to="/track-order"
                            search={{
                              order: order.order_number || "",
                              email: auth.user?.email || "",
                            }}
                            className="mt-4 inline-block text-xs font-semibold uppercase tracking-[0.12em] underline"
                          >
                            Track this order
                          </Link>
                        </details>
                      ))
                    )}
                  </div>
                </section>

                <section className="bg-background p-5 sm:p-7">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5" />
                    <h2 className="font-display text-3xl">Saved addresses</h2>
                  </div>
                  <div className="mt-5 grid gap-3">
                    {(addresses || []).map((item) => (
                      <div
                        key={item.id}
                        className="border border-foreground/15 p-4 text-sm leading-6"
                      >
                        <strong>{item.full_name}</strong>
                        {item.is_default ? (
                          <span className="ml-2 text-[10px] uppercase text-muted-foreground">
                            Default
                          </span>
                        ) : null}
                        <br />
                        {item.address_line_1}
                        {item.address_line_2 ? `, ${item.address_line_2}` : ""}, {item.city},{" "}
                        {item.state} {item.postal_code}
                        <br />
                        {item.country} · {item.phone}
                        <button
                          onClick={() => void setDefaultAddress({ id: item.id })}
                          disabled={Boolean(item.is_default)}
                          className="mt-2 mr-4 text-xs underline disabled:hidden"
                        >
                          Make default
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("Remove this saved address?"))
                              void removeAddress({ id: item.id });
                          }}
                          className="mt-2 text-xs text-red-700 underline"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={submitAddress} className="mt-6 grid gap-3 sm:grid-cols-2">
                    <AccountInput
                      label="Full name"
                      value={address.full_name}
                      onChange={(value) => setAddress((item) => ({ ...item, full_name: value }))}
                    />
                    <AccountInput
                      label="Phone"
                      value={address.phone}
                      onChange={(value) => setAddress((item) => ({ ...item, phone: value }))}
                    />
                    <div className="sm:col-span-2">
                      <AccountInput
                        label="Address"
                        value={address.address_line_1}
                        onChange={(value) =>
                          setAddress((item) => ({ ...item, address_line_1: value }))
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <AccountInput
                        label="Apartment, suite, etc. (optional)"
                        required={false}
                        value={address.address_line_2}
                        onChange={(value) =>
                          setAddress((item) => ({ ...item, address_line_2: value }))
                        }
                      />
                    </div>
                    <AccountInput
                      label="City"
                      value={address.city}
                      onChange={(value) => setAddress((item) => ({ ...item, city: value }))}
                    />
                    <AccountInput
                      label="State / region"
                      value={address.state}
                      onChange={(value) => setAddress((item) => ({ ...item, state: value }))}
                    />
                    <AccountInput
                      label="Postal code"
                      value={address.postal_code}
                      onChange={(value) => setAddress((item) => ({ ...item, postal_code: value }))}
                    />
                    <SearchSelect
                      label="Country"
                      value={address.country}
                      options={COUNTRY_OPTIONS}
                      searchPlaceholder="Type a country or code…"
                      emptyText="No country found."
                      onValueChange={(value) => setAddress((item) => ({ ...item, country: value }))}
                    />
                    {message ? (
                      <p role="alert" className="text-sm text-red-700 sm:col-span-2">
                        {message}
                      </p>
                    ) : null}
                    <button className="bg-foreground py-3 text-xs font-semibold uppercase tracking-[0.15em] text-background sm:col-span-2">
                      Save address
                    </button>
                  </form>
                </section>
              </div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </StoreShell>
  );
}

function AccountInput({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: "text" | "numeric" | "email" | "tel";
  required?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
      {label}
      <input
        required={required}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 border border-foreground/20 bg-transparent px-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-foreground"
      />
    </label>
  );
}
