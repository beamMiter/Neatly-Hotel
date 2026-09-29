import Navbar from "@/components/layout/Navbar";
import { notoSerifDisplay } from "@/lib/fonts";
import { getCloudAssetUrl } from "@/lib/supabase-storage";

type AuthPageShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

// Shared frame for the auth pages (login, forgot password, set new password):
// full-height hero on the left, form column on the right.
export function AuthPageShell({ title, description, children }: AuthPageShellProps) {
  const heroImageUrl = getCloudAssetUrl("room-images", "site-images/auth/login-pool-exterior.png");

  return (
    <div className="flex h-screen flex-col">
      <Navbar hideLogin />
      <main className="flex min-h-0 flex-1">
        <div className="relative hidden flex-1 bg-[#D6D9E4] lg:block">
          <img src={heroImageUrl} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-linear-to-b from-black/0 from-47% to-black/40" />
        </div>

        {/* items-start + my-auto rather than items-center: centring via
            align-items pushes the overflow of an over-tall form out past the
            container's start edge, where it can't be scrolled back into view.
            An auto margin centres the same way when there's room to spare and
            collapses to 0 when there isn't, keeping the top reachable. */}
        <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto bg-[#F7F7FB] px-6 py-16">
          <div className="my-auto flex w-full max-w-113 flex-col gap-15">
            {description ? (
              <div className="flex flex-col gap-3">
                <h1
                  className={`${notoSerifDisplay.className} font-medium font-stretch-[87.5%] text-[68px] leading-tight tracking-[-0.02em] text-[#2F3E35]`}
                >
                  {title}
                </h1>
                <p className="text-base text-[#646D89]">{description}</p>
              </div>
            ) : (
              <h1
                className={`${notoSerifDisplay.className} font-medium font-stretch-[87.5%] text-[68px] leading-tight tracking-[-0.02em] text-[#2F3E35]`}
              >
                {title}
              </h1>
            )}
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
