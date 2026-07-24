import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/account/LoginForm";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to view your NP Coaches tickets and lost-property claims.",
  robots: { index: false },
};

export default async function LoginPage() {
  if (await getSession()) redirect("/account");

  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:py-24">
      <div className="rounded-2xl border border-greyblue/20 bg-white p-8 shadow-sm">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-accent/10 text-accent">
          <Icon name="user" className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold text-navy">Sign in to your account</h1>
        <p className="mt-1 text-sm text-navy/60">View your tickets and lost-property claims — no password required.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </section>
  );
}
