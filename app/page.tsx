"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Gate } from "@/components/auth/gate";

export default function HomePage() {
  const router = useRouter();

  return (
    <>
      <AuthLoading>
        <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">Loading...</div>
      </AuthLoading>
      <Unauthenticated>
        <Gate />
      </Unauthenticated>
      <Authenticated>
        <RedirectToDashboard router={router} />
      </Authenticated>
    </>
  );
}

function RedirectToDashboard({ router }: { router: ReturnType<typeof useRouter> }) {
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">Loading...</div>;
}
