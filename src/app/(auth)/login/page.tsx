import { redirect } from "next/navigation";

import { LoginForm } from "@/components/forms/login-form";
import { getServerAuthSession } from "@/server/auth/session";

export default async function LoginPage() {
  const session = await getServerAuthSession();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
