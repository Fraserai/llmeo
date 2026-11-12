"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function onSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    setError(null);

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("We couldn't sign you in with those details.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <Card className="border-white/70 bg-white/95 shadow-[0_30px_100px_-60px_rgba(15,23,42,0.45)]">
      <CardHeader>
        <CardTitle className="text-2xl">Sign in</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <Input id="email" name="email" type="email" placeholder="demo@ausllmeo.com.au" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="password">
              Password
            </label>
            <Input id="password" name="password" type="password" placeholder="Demo123!" required />
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button className="h-11 w-full rounded-full bg-slate-950 text-white hover:bg-slate-800" disabled={isPending}>
            {isPending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          Demo credentials: <span className="font-medium text-slate-950">demo@ausllmeo.com.au / Demo123!</span>
        </div>
        <p className="text-sm text-slate-600">
          New here?{" "}
          <Link href="/signup" className="font-medium text-slate-950 underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
