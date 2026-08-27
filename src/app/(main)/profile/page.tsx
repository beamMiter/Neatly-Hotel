import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/server/db/supabase-server";
import { getOwnProfileForEdit } from "@/server/queries/profiles.query";
import { EditProfileForm } from "@/features/profile/components/EditProfileForm";

export const metadata: Metadata = {
  title: "My Profile | Neatly Hotel",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getOwnProfileForEdit(user.id);

  return (
    <div className="w-full bg-[#F7F7FB]">
      <div className="mx-auto max-w-[930px] px-4 py-10 lg:py-20">
        {profile ? (
          <EditProfileForm email={user.email ?? ""} initialValues={profile} />
        ) : (
          <div>
            <h1 className="[font-family:var(--font-noto-serif)] font-stretch-semi-condensed text-[44px] leading-[125%] font-medium tracking-[-0.02em] text-[#2F3E35] lg:text-[68px]">
              Profile
            </h1>
            <p className="mt-6 text-sm text-brand-body">
              This account doesn&apos;t have a customer profile to edit — staff/admin accounts are managed separately.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
