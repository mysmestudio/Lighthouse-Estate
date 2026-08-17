// Supabase Edge Function: verify-gate-pass
// Language / Runtime: TypeScript / Deno
// Deployed to: /supabase/functions/verify-gate-pass/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface VerifyPassPayload {
  code?: string;
  pass_id?: string;
  guard_name?: string;
  method?: "pin" | "qr";
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: "server_misconfiguration",
          message: "Supabase service role credentials not configured.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Admin / Service-Role Supabase client (service-role key is never exposed to browser)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const body: VerifyPassPayload = await req.json();
    const rawCode = (body.code || "").trim();
    const passId = (body.pass_id || "").trim();
    const guardName = (body.guard_name || "Gate Security Officer").trim();
    const verifiedMethod = body.method || (passId ? "qr" : "pin");

    if (!rawCode && !passId) {
      return new Response(
        JSON.stringify({
          success: false,
          reason: "not_found",
          message: "A valid 6-digit access code or QR payload is required.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();

    // 1. RATE-LIMIT CHECK: If same code/identifier failed 5+ times in last 10 minutes, reject immediately
    if (rawCode) {
      const { data: recentFailures, error: failCountErr } = await supabaseAdmin
        .from("pass_verification_attempts")
        .select("id")
        .eq("pass_code", rawCode)
        .eq("status", "failed")
        .gte("attempted_at", tenMinutesAgo);

      if (!failCountErr && recentFailures && recentFailures.length >= 5) {
        // Log rate-limit incident
        await supabaseAdmin.from("pass_verification_attempts").insert({
          pass_code: rawCode,
          attempted_at: now.toISOString(),
          status: "failed",
          reason: "rate_limited",
          guard_name: guardName,
          verified_method: verifiedMethod,
        });

        return new Response(
          JSON.stringify({
            success: false,
            code: rawCode,
            status: "rate_limited",
            reason: "rate_limited",
            message: "SECURITY LOCKOUT: 5+ failed verification attempts in the last 10 minutes. Code temporarily blocked.",
            timestamp: now.toISOString(),
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 2. LOOK UP THE PASS in access_passes
    let query = supabaseAdmin.from("access_passes").select("*");
    if (passId) {
      query = query.eq("id", passId);
    } else {
      query = query.eq("pass_code", rawCode);
    }

    const { data: passes, error: passErr } = await query.limit(1);

    if (passErr || !passes || passes.length === 0) {
      // Log attempt
      await supabaseAdmin.from("pass_verification_attempts").insert({
        pass_code: rawCode || passId,
        attempted_at: now.toISOString(),
        status: "failed",
        reason: "not_found",
        guard_name: guardName,
        verified_method: verifiedMethod,
      });

      return new Response(
        JSON.stringify({
          success: false,
          code: rawCode,
          status: "not_found",
          reason: "not_found",
          message: "Pass code not recognized in Lighthouse Estate security registry.",
          timestamp: now.toISOString(),
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pass = passes[0];
    const expiryDate = new Date(pass.expires_at || pass.valid_until);

    // 3. CHECK REVOKED
    if (pass.status === "revoked") {
      await supabaseAdmin.from("pass_verification_attempts").insert({
        pass_id: pass.id,
        pass_code: pass.pass_code,
        attempted_at: now.toISOString(),
        status: "failed",
        reason: "revoked",
        guard_name: guardName,
        verified_method: verifiedMethod,
        visitor_name: pass.guest_name,
        house_info: `House ${pass.house_number} (${pass.house_unit})`,
      });

      return new Response(
        JSON.stringify({
          success: false,
          code: pass.pass_code,
          status: "revoked",
          reason: "revoked",
          message: "This pass has been explicitly revoked by the resident or estate command.",
          timestamp: now.toISOString(),
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. CHECK EXPIRY
    if (expiryDate.getTime() < now.getTime() || pass.status === "expired") {
      // Mark as expired in DB
      if (pass.status !== "expired") {
        await supabaseAdmin.from("access_passes").update({ status: "expired" }).eq("id", pass.id);
      }

      await supabaseAdmin.from("pass_verification_attempts").insert({
        pass_id: pass.id,
        pass_code: pass.pass_code,
        attempted_at: now.toISOString(),
        status: "failed",
        reason: "expired",
        guard_name: guardName,
        verified_method: verifiedMethod,
        visitor_name: pass.guest_name,
        house_info: `House ${pass.house_number} (${pass.house_unit})`,
      });

      return new Response(
        JSON.stringify({
          success: false,
          code: pass.pass_code,
          status: "expired",
          reason: "expired",
          message: `This pass expired on ${expiryDate.toLocaleDateString()} at ${expiryDate.toLocaleTimeString()}.`,
          timestamp: now.toISOString(),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. STATE MACHINE LOGIC
    // Case A: Fresh ACTIVE Pass -> Mark USED (Entry Granted)
    if (pass.status === "active") {
      const { error: updateErr } = await supabaseAdmin
        .from("access_passes")
        .update({
          status: "used",
          verified_at: now.toISOString(),
          verified_by: guardName,
        })
        .eq("id", pass.id);

      if (updateErr) {
        throw updateErr;
      }

      // Log attempt
      await supabaseAdmin.from("pass_verification_attempts").insert({
        pass_id: pass.id,
        pass_code: pass.pass_code,
        attempted_at: now.toISOString(),
        status: "success",
        reason: "success",
        guard_name: guardName,
        verified_method: verifiedMethod,
        visitor_name: pass.guest_name,
        house_info: `House ${pass.house_number} (${pass.house_unit})`,
      });

      // Insert access log for entry
      await supabaseAdmin.from("access_logs").insert({
        pass_id: pass.id,
        pass_code: pass.pass_code,
        visitor_name: pass.guest_name,
        house_info: `House ${pass.house_number} (${pass.house_unit})`,
        direction: "in",
        guard_name: guardName,
        timestamp: now.toISOString(),
        vehicle_plate: pass.guest_plate_number,
        verified_method: verifiedMethod,
        notes: `Entry cleared. Pass type: ${pass.pass_type}`,
      });

      // Return sanitized payload — NEVER expose user PINs or passwords
      return new Response(
        JSON.stringify({
          success: true,
          code: pass.pass_code,
          status: "used",
          actionTaken: "granted_entry",
          reason: "success",
          message: "ACCESS GRANTED: Inbound visitor clearance verified.",
          pass: {
            id: pass.id,
            guest_name: pass.guest_name,
            pass_type: pass.pass_type,
            guest_count: pass.guest_count || 1,
            guest_phone: pass.guest_phone,
            guest_plate_number: pass.guest_plate_number,
            house_number: pass.house_number,
            house_unit: pass.house_unit,
            resident_name: pass.resident_name,
            resident_phone: pass.resident_phone,
            valid_until: pass.expires_at || pass.valid_until,
            status: "used",
          },
          timestamp: now.toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Case B: Already USED pass OR Exit-type pass -> Mark OUT (Exit Clearance Granted)
    if (pass.status === "used" || pass.pass_type === "exit") {
      const { error: updateErr } = await supabaseAdmin
        .from("access_passes")
        .update({
          status: "out",
          checked_out_at: now.toISOString(),
        })
        .eq("id", pass.id);

      if (updateErr) {
        throw updateErr;
      }

      await supabaseAdmin.from("pass_verification_attempts").insert({
        pass_id: pass.id,
        pass_code: pass.pass_code,
        attempted_at: now.toISOString(),
        status: "success",
        reason: "checked_out",
        guard_name: guardName,
        verified_method: verifiedMethod,
        visitor_name: pass.guest_name,
        house_info: `House ${pass.house_number} (${pass.house_unit})`,
      });

      // Insert access log for exit
      await supabaseAdmin.from("access_logs").insert({
        pass_id: pass.id,
        pass_code: pass.pass_code,
        visitor_name: pass.guest_name,
        house_info: `House ${pass.house_number} (${pass.house_unit})`,
        direction: "out",
        guard_name: guardName,
        timestamp: now.toISOString(),
        vehicle_plate: pass.guest_plate_number,
        verified_method: verifiedMethod,
        notes: `Outbound exit departure verified.`,
      });

      return new Response(
        JSON.stringify({
          success: true,
          code: pass.pass_code,
          status: "out",
          actionTaken: "granted_exit",
          reason: "checked_out",
          message: "EXIT CLEARANCE GRANTED: Visitor departure logged.",
          pass: {
            id: pass.id,
            guest_name: pass.guest_name,
            pass_type: pass.pass_type,
            guest_count: pass.guest_count || 1,
            guest_phone: pass.guest_phone,
            guest_plate_number: pass.guest_plate_number,
            house_number: pass.house_number,
            house_unit: pass.house_unit,
            resident_name: pass.resident_name,
            resident_phone: pass.resident_phone,
            valid_until: pass.expires_at || pass.valid_until,
            status: "out",
          },
          timestamp: now.toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Case C: Already marked OUT (departure completed)
    if (pass.status === "out") {
      await supabaseAdmin.from("pass_verification_attempts").insert({
        pass_id: pass.id,
        pass_code: pass.pass_code,
        attempted_at: now.toISOString(),
        status: "failed",
        reason: "already_used",
        guard_name: guardName,
        verified_method: verifiedMethod,
        visitor_name: pass.guest_name,
        house_info: `House ${pass.house_number} (${pass.house_unit})`,
      });

      return new Response(
        JSON.stringify({
          success: false,
          code: pass.pass_code,
          status: "out",
          reason: "already_used",
          message: "This pass has already been used and visitor has already checked out.",
          timestamp: now.toISOString(),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default fallback
    return new Response(
      JSON.stringify({
        success: false,
        code: pass.pass_code,
        status: pass.status,
        reason: "revoked",
        message: `Pass status is currently ${pass.status}. Access denied.`,
        timestamp: now.toISOString(),
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        reason: "server_error",
        message: err.message || "Internal verification service error.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
