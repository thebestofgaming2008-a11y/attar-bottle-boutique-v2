import { convexAuth } from "@convex-dev/auth/server";
import { Email } from "@convex-dev/auth/providers/Email";
import { Password } from "@convex-dev/auth/providers/Password";

const resetEmailProvider = Email({
  id: "password-reset",
  name: "Password reset",
  from: process.env.AUTH_EMAIL_FROM ?? "BADR <no-reply@badrattars.com>",
  maxAge: 30 * 60,
  generateVerificationToken() {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return String(100000 + (values[0] % 900000));
  },
  async sendVerificationRequest({ identifier, token }) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.AUTH_EMAIL_FROM ?? "BADR <no-reply@badrattars.com>";
    if (!apiKey) {
      throw new Error(
        "Password reset email is not configured. Add RESEND_API_KEY in Convex environment variables.",
      );
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: identifier,
        subject: "Reset your BADR password",
        text: `Assalamu alaikum,\n\nUse this code to reset your BADR password:\n\n${token}\n\nThis code expires in 30 minutes. If you did not request this, you can ignore this email.`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#06133a">
            <h2 style="margin:0 0 12px">Reset your BADR password</h2>
            <p>Assalamu alaikum,</p>
            <p>Use this code to reset your password:</p>
            <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:18px 0">${token}</p>
            <p>This code expires in 30 minutes.</p>
            <p style="color:#667085">If you did not request this, you can ignore this email.</p>
          </div>
        `,
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Could not send password reset email. ${detail}`.trim());
    }
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      reset: resetEmailProvider,
      profile(params) {
        const email = typeof params.email === "string" ? params.email : String(params.email ?? "");
        return {
          email: email.toLowerCase(),
        };
      },
      validatePasswordRequirements(password) {
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
      },
    }),
  ],
});
