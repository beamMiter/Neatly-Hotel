import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const runWriteProbe = process.argv.includes("--write-probe");
const useEphemeralAuth = process.argv.includes("--ephemeral-auth");

if (!url || !publishableKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required");
}

const anon = createClient(url, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const admin = secretKey
  ? createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

function isAccessDenied(error) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "42501" || message.includes("permission denied") || message.includes("row-level security");
}

async function expectDenied(label, operation) {
  const { error } = await operation();
  if (!error) throw new Error(`${label}: access was unexpectedly allowed`);
  if (!isAccessDenied(error)) throw new Error(`${label}: unexpected database error (${error.code ?? "unknown"})`);
  console.log(`PASS ${label}`);
}

async function verifyReads(label, client) {
  await expectDenied(`${label} cannot read support_conversations`, () =>
    client.from("support_conversations").select("id").limit(1),
  );
  await expectDenied(`${label} cannot read support_messages`, () =>
    client.from("support_messages").select("id").limit(1),
  );
}

async function verifyWrites(label, client, admin) {
  const visitorToken = randomUUID();
  const conversationAttempt = await client
    .from("support_conversations")
    .insert({ visitor_token: visitorToken })
    .select("id")
    .maybeSingle();

  if (!conversationAttempt.error) {
    if (conversationAttempt.data?.id) {
      await admin.from("support_conversations").delete().eq("id", conversationAttempt.data.id);
    }
    throw new Error(`${label} can insert support_conversations`);
  }
  if (!isAccessDenied(conversationAttempt.error)) {
    throw new Error(`${label} conversation write returned an unexpected error (${conversationAttempt.error.code ?? "unknown"})`);
  }
  console.log(`PASS ${label} cannot insert support_conversations`);

  const { data: probeConversation, error: createError } = await admin
    .from("support_conversations")
    .insert({ visitor_token: randomUUID(), topic: "other" })
    .select("id")
    .single();
  if (createError || !probeConversation) throw new Error("Unable to create the temporary RLS probe conversation");

  try {
    await expectDenied(`${label} cannot insert support_messages`, () =>
      client.from("support_messages").insert({
        conversation_id: probeConversation.id,
        sender: "visitor",
        content: "RLS write probe",
      }),
    );
  } finally {
    await admin.from("support_conversations").delete().eq("id", probeConversation.id);
  }
}

const clients = [{ label: "anon", client: anon }];
const testEmail = process.env.RLS_TEST_USER_EMAIL;
const testPassword = process.env.RLS_TEST_USER_PASSWORD;
let ephemeralUserId = null;

if (testEmail && testPassword) {
  const authenticated = createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await authenticated.auth.signInWithPassword({ email: testEmail, password: testPassword });
  if (error) throw new Error("Unable to sign in with the configured RLS test user");
  clients.push({ label: "authenticated", client: authenticated });
} else if (useEphemeralAuth) {
  if (!admin) throw new Error("SUPABASE_SECRET_KEY is required for the ephemeral authenticated probe");
  const authenticated = createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const email = `rls-probe-${randomUUID()}@example.invalid`;
  const password = `${randomUUID()}Aa1!`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) throw new Error("Unable to create the ephemeral RLS test user");
  ephemeralUserId = created.user.id;
  const { error: signInError } = await authenticated.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error("Unable to sign in as the ephemeral RLS test user");
  clients.push({ label: "authenticated", client: authenticated });
} else {
  console.warn(
    "SKIP authenticated checks: set RLS_TEST_USER_EMAIL/RLS_TEST_USER_PASSWORD or pass --ephemeral-auth",
  );
}

try {
  for (const { label, client } of clients) {
    await verifyReads(label, client);
  }

  if (runWriteProbe) {
    if (!admin) throw new Error("SUPABASE_SECRET_KEY is required for the self-cleaning write probe");
    for (const { label, client } of clients) {
      await verifyWrites(label, client, admin);
    }
  } else {
    console.warn("SKIP write checks: rerun with --write-probe after approving the temporary self-cleaning probe");
  }
} finally {
  if (ephemeralUserId && admin) {
    await admin.auth.admin.deleteUser(ephemeralUserId);
  }
}
