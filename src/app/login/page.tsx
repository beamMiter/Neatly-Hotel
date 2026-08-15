import { LoginForm } from "@/features/auth/components/LoginForm";
import { notoSerifDisplay } from "@/lib/fonts";
import { getCloudAssetUrl } from "@/lib/supabase-storage";

export default function LoginPage() {
  const heroImageUrl = getCloudAssetUrl("room-images", "site-images/auth/login-pool-exterior.png");

  return (
    <main className="flex h-screen">
      <div className="relative hidden flex-1 bg-[#D6D9E4] lg:block">
        <img src={heroImageUrl} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-linear-to-b from-black/0 from-47% to-black/40" />
      </div>

      <div className="flex flex-1 items-center justify-center bg-[#F7F7FB] px-6 py-16">
        <div className="flex w-full max-w-113 flex-col gap-15">
          <h1
            className={`${notoSerifDisplay.className} font-medium font-stretch-[87.5%] text-[68px] leading-tight tracking-[-0.02em] text-[#2F3E35]`}
          >
            Log In
          </h1>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
