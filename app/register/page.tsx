import Image from "next/image";
import type { Metadata } from "next";
import { Navbar } from "@/src/components/layout/Navbar";
import { RegisterForm } from "@/src/components/register/RegisterForm";

export const metadata: Metadata = {
  title: "Register | Neatly Hotel",
  description: "Create your Neatly Hotel account",
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="relative flex-1">
        <Image
          src="/images/register-bg.jpg"
          alt=""
          fill
          priority
          className="object-cover"
        />

        <div className="relative flex justify-center px-0 py-0 sm:px-8 sm:py-12 lg:px-32 lg:py-16">
          <div className="w-full bg-brand-surface px-4 py-8 sm:max-w-3xl sm:px-14 sm:py-10">
            <h1 className="font-serif text-4xl text-brand-ink">Register</h1>

            <div className="mt-8">
              <RegisterForm />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
