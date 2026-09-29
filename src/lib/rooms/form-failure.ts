export type RoomFormAction = "create" | "update" | "delete";

export type RoomFormFailure = {
  title: string;
  reason: string;
  hint: string;
};

const ACTION_LABEL: Record<RoomFormAction, string> = {
  create: "create the room",
  update: "save your changes",
  delete: "delete the room",
};

type ResponseBody = { message?: string; kind?: string } | null;

export const IMAGES_TOO_LARGE_FAILURE: RoomFormFailure = {
  title: "Images are too large",
  reason:
    "The selected images add up to more than 4MB even after compression, which is the most the server accepts in one request.",
  hint: "Remove some images or pick smaller ones, then try again.",
};

/**
 * Turns whatever went wrong with a room form request into something an admin
 * can act on. Pass `response: null` when fetch itself threw (offline, DNS,
 * server down) — there is no status in that case.
 */
export function describeRoomFormFailure(
  action: RoomFormAction,
  response: { status: number } | null,
  body: ResponseBody,
): RoomFormFailure {
  const label = ACTION_LABEL[action];

  if (!response) {
    return {
      title: "Can't reach the server",
      reason: `We couldn't connect, so the room was not ${action === "delete" ? "deleted" : "saved"}. This is usually a network problem.`,
      hint: "Check your internet connection and try again. What you typed is still in the form.",
    };
  }

  switch (response.status) {
    case 401:
      return {
        title: "Your session has expired",
        reason: `You were signed out, so we couldn't ${label}.`,
        hint: "Log in again, then retry.",
      };
    case 403:
      return {
        title: "You don't have permission",
        reason: `Only active staff accounts can ${label}.`,
        hint: "Ask an admin to check your account.",
      };
    case 400:
      return {
        title: "Some information is invalid",
        reason: "The server rejected the form data.",
        hint: "Fix the fields highlighted in red and try again.",
      };
    case 409:
      if (body?.kind === "in-use") {
        return {
          title: "This room type is still in use",
          reason: body.message ?? "Physical rooms or bookings still reference this room type.",
          hint: "Remove or reassign those rooms first, then delete it.",
        };
      }
      return {
        title: "Room name already in use",
        reason: body?.message ?? "Another room type already has this name.",
        hint: "Choose a different Room Type name and try again.",
      };
    case 413:
      return IMAGES_TOO_LARGE_FAILURE;
    case 502:
      return {
        title: "Image upload failed",
        reason: body?.message ?? "One of the images could not be stored.",
        hint:
          action === "create"
            ? "Nothing was saved. Try again, or use different images."
            : "Your other changes may already be saved. Reopen the room to check, then try again.",
      };
    default:
      return {
        title: "Something went wrong on our side",
        reason: body?.message ?? `We couldn't ${label} because of a server error.`,
        hint: "Try again in a moment. If it keeps happening, contact the dev team.",
      };
  }
}
