"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Eye, EyeOff, Hospital, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/lib/api/services/auth.service";
import { getErrorMessage } from "@/lib/utils/errors";
import { loginSchema, type LoginFormValues } from "@/lib/validators/auth.schema";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      const { accessToken, user } = await authService.login(values);
      setAuth(user, accessToken);
      toast.success(`Welcome back, ${user.name}!`);
      router.replace("/dashboard");
    } catch (err) {
      const msg = getErrorMessage(err);
      if (msg.includes("429") || msg.toLowerCase().includes("many")) {
        toast.error("Too many login attempts. Please wait 15 minutes.");
      } else {
        toast.error("Invalid email or password");
      }
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] bg-blue-600 p-10 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-xl p-2">
            <Hospital className="w-6 h-6" />
          </div>
          <span className="font-semibold text-lg tracking-tight">MediCore HMS</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Streamline your hospital operations
          </h1>
          <p className="text-blue-100 text-base leading-relaxed">
            Manage appointments, doctors, patients, and billing — all in one centralized platform.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Patients managed", value: "10,000+" },
            { label: "Appointments daily", value: "500+" },
            { label: "Doctors onboarded", value: "150+" },
            { label: "Uptime", value: "99%" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/10 rounded-xl p-4">
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-blue-200 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="bg-blue-600 rounded-xl p-2">
              <Hospital className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900 text-lg">MediCore HMS</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Sign in to your account</h2>
            <p className="text-gray-500 mt-1 text-sm">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} method="post" className="space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@hospital.com"
                {...register("email")}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white
                           placeholder:text-gray-400 transition-all outline-none
                           focus:border-blue-400 focus:ring-2 focus:ring-blue-100
                           aria-invalid:border-red-400 aria-invalid:ring-red-100"
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register("password")}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white
                             placeholder:text-gray-400 pr-11 transition-all outline-none
                             focus:border-blue-400 focus:ring-2 focus:ring-blue-100
                             aria-invalid:border-red-400"
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed
                         text-white font-semibold py-2.5 rounded-xl text-sm transition-colors
                         flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            MediCore HMS · Hospital Appointment &amp; Channeling Management
          </p>
        </div>
      </div>
    </div>
  );
}
