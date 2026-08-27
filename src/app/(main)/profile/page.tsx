import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/server/db/supabase-server";
import { getOwnProfileForEdit } from "@/server/queries/profiles.query";
import { isStaff, getOwnStaffProfileForEdit } from "@/server/queries/staff-members.query";
import { EditProfileForm } from "@/features/profile/components/EditProfileForm";
import { EditStaffProfileForm } from "@/features/profile/components/EditStaffProfileForm";

export const metadata: Metadata = {
  title: "My Profile | Neatly Hotel",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Staff/admin accounts edit their own row in staff_members (separate table,
  // separate form — no dateOfBirth/country), customers edit `profiles`.
  const staff = await isStaff(user.id);
  const [profile, staffProfile] = await Promise.all([
    staff ? null : getOwnProfileForEdit(user.id),
    staff ? getOwnStaffProfileForEdit(user.id) : null,
  ]);

  return (
    <div className="w-full flex-1 bg-[#F7F7FB]">
      <div className="mx-auto max-w-[930px] px-4 py-10 lg:py-20">
        {staffProfile ? (
          <EditStaffProfileForm email={user.email ?? ""} initialValues={staffProfile} />
        ) : profile ? (
          <EditProfileForm email={user.email ?? ""} initialValues={profile} />
        ) : (
          <div>
            <h1 className="[font-family:var(--font-noto-serif)] font-stretch-semi-condensed text-[44px] leading-[125%] font-medium tracking-[-0.02em] text-[#2F3E35] lg:text-[68px]">
              Profile
            </h1>
            <p className="mt-6 text-sm text-brand-body">
              This account doesn&apos;t have a profile to edit — please contact support.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
