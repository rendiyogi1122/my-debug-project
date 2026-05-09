"use client";

import { respondInvite } from "@/lib/actions/room";
import { Button } from "@/components/ui/button";

export function InviteCard({ invite }: { invite: any }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-700/50 px-4 py-3">
      <div>
        <p className="text-sm text-white">
          <span className="font-medium text-indigo-300">
            {invite.profiles?.name}
          </span>{" "}
          mengundangmu ke room{" "}
          <span className="font-mono font-bold text-teal-300">
            {invite.rooms?.room_code}
          </span>
        </p>
      </div>
      <div className="flex gap-2 ml-4">
        <form action={respondInvite.bind(null, invite.id, true)}>
          <Button type="submit" size="sm">Terima</Button>
        </form>
        <form action={respondInvite.bind(null, invite.id, false)}>
          <Button type="submit" size="sm" variant="danger">Tolak</Button>
        </form>
      </div>
    </div>
  );
}