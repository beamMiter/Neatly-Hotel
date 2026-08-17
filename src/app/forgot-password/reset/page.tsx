import { Navbar } from "@/components/layout/Navbar";
import { NewPasswordForm } from "@/features/auth/components/NewPasswordForm";
import { notoSerifDisplay } from "@/lib/fonts";
import { getCloudAssetUrl } from "@/lib/supabase-storage";

export default function ForgotPasswordResetPage() {
  const heroImageUrl = getCloudAssetUrl("room-images", "site-images/auth/login-pool-exterior.png");

  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <main className="flex min-h-0 flex-1">
        <div className="relative hidden flex-1 bg-[#D6D9E4] lg:block">
          <img src={heroImageUrl} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-linear-to-b from-black/0 from-47% to-black/40" />
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto bg-[#F7F7FB] px-6 py-16">
          <div className="flex w-full max-w-113 flex-col gap-15">
            <h1
              className={`${notoSerifDisplay.className} font-medium font-stretch-[87.5%] text-[68px] leading-tight tracking-[-0.02em] text-[#2F3E35]`}
            >
              Set New Password
            </h1>
            <NewPasswordForm />
          </div>
        </div>
      </main>
    </div>
  );
}
