import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/server/db/supabase-server";
import { getOwnProfileForEdit } from "@/server/queries/profiles.query";
import { isStaff } from "@/server/queries/staff-members.query";
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

  // Staff/admin accounts don't get a self-edit UI here — per the team's
  // call, an admin's own name/phone/avatar (staff_members) is edited
  // directly in Supabase, not through the website. The navbar hides the
  // "Profile" link for admins; this message only shows if one navigates
  // here directly (e.g. an old bookmark).
  const staff = await isStaff(user.id);
  const profile = staff ? null : await getOwnProfileForEdit(user.id);

  return (
    <div className="w-full flex-1 bg-[#F7F7FB]">
      <div className="mx-auto max-w-[930px] px-4 py-10 lg:py-20">
        {profile ? (
          <EditProfileForm email={user.email ?? ""} initialValues={profile} />
        ) : (
          <div>
            <h1 className="[font-family:var(--font-noto-serif)] font-stretch-semi-condensed text-[44px] leading-[125%] font-medium tracking-[-0.02em] text-[#2F3E35] lg:text-[68px]">
              Profile
            </h1>
            <p className="mt-6 text-sm text-brand-body">
              {staff
                ? "Staff/admin accounts are managed directly in Supabase, not through this page."
                : "This account doesn't have a profile to edit — please contact support."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
