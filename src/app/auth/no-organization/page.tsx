"use client";

import { signOut } from "next-auth/react";

export default function NoOrganizationPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🏢</div>
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">
              No Organization
            </h1>
            <p className="text-zinc-600 mb-6">
              You are not a member of any organization. Please contact your
              administrator to get access.
            </p>
            <button
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              className="px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
