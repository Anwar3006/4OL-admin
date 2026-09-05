import { NextRequest, NextResponse } from "next/server";

import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import {
  containsSensitiveAudience,
  latestConsents,
  type ConsentRecord,
} from "@/lib/period-tracker";

import { WriteSchema } from "../_lib/schema";
import { slugify, unsafeHtml, writeAudit } from "../_lib/helpers";

/** Every mutation the Period Tracker admin screen performs. */

export async function POST(request: NextRequest) {
  const auth = await requireAdminApiUser("period.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;
  const parsed = WriteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const admin = getAdminClient();
  const input = parsed.data;

  if (input.action === "create_campaign") {
    const targetDefinition = input.region ? { region: input.region } : {};
    if (containsSensitiveAudience(targetDefinition)) return NextResponse.json({ error: "Sensitive health attributes cannot be used for campaign targeting" }, { status: 400 });
    const { data, error } = await admin.from("period_campaigns").insert({
      name: input.name,
      campaign_type: input.campaignType,
      channel: input.channel,
      target_definition: targetDefinition,
      partner_name: input.partnerName ?? null,
      scheduled_at: input.scheduledAt ?? null,
      status: "draft",
      consent_type: "marketing",
      minimum_cohort_size: input.minimumCohortSize,
      frequency_cap_days: input.frequencyCapDays,
      created_by: user.id,
    }).select("id").single();
    if (error) return NextResponse.json({ error: "Unable to create campaign" }, { status: 500 });
    await writeAudit(user.id, "create", "period_campaign", data.id, { channel: input.channel, scheduledAt: input.scheduledAt ?? null });
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  }

  if (input.action === "dispatch_campaign") {
    // G7: turns a campaign into real in-app notifications. Audience = users
    // whose LATEST consent for the campaign's consent type is granted, minus
    // anyone notified by a Period campaign inside the frequency-cap window.
    // Rejects when the reachable cohort is below the campaign's minimum so
    // small sensitive groups are never singled out.
    const { data: campaign, error: campaignError } = await admin.from("period_campaigns").select("id,status,channel,consent_type,minimum_cohort_size,frequency_cap_days,reached_count").eq("id", input.campaignId).maybeSingle();
    if (campaignError || !campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    if (campaign.status === "completed" || campaign.status === "cancelled") return NextResponse.json({ error: "This campaign has already finished" }, { status: 409 });
    if (campaign.channel !== "in_app") return NextResponse.json({ error: "Only in-app campaigns can be dispatched from here" }, { status: 409 });

    const consentType = campaign.consent_type || "marketing";
    const { data: consentRows, error: consentError } = await admin.from("period_consent_events").select("user_id,granted,created_at").eq("consent_type", consentType).order("created_at", { ascending: false }).limit(20_000);
    if (consentError) return NextResponse.json({ error: "Unable to resolve the campaign audience" }, { status: 500 });
    const optedIn = new Set<string>();
    const seen = new Set<string>();
    for (const row of consentRows ?? []) {
      if (seen.has(row.user_id)) continue;
      seen.add(row.user_id);
      if (row.granted) optedIn.add(row.user_id);
    }

    const capDays = Math.max(1, Number(campaign.frequency_cap_days ?? 7));
    const capSince = new Date(Date.now() - capDays * 86400000).toISOString();
    const { data: recentNotifications, error: recentError } = await admin.from("notifications").select("user_id").eq("type", "period_campaign").gte("created_at", capSince).limit(20_000);
    if (recentError) return NextResponse.json({ error: "Unable to apply the frequency cap" }, { status: 500 });
    const recentlyReached = new Set((recentNotifications ?? []).map((row: any) => row.user_id));
    const audience = [...optedIn].filter((userId) => !recentlyReached.has(userId));

    const minimumCohort = Math.max(25, Number(campaign.minimum_cohort_size ?? 100));
    if (audience.length < minimumCohort) {
      return NextResponse.json({ error: `Reachable cohort is ${audience.length} — below the ${minimumCohort} minimum. Broaden the audience or lower the frequency cap.` }, { status: 409 });
    }

    const { error: insertError } = await admin.from("notifications").insert(audience.map((userId) => ({ user_id: userId, title: input.title, body: input.message, type: "period_campaign", metadata: { campaign_id: campaign.id }, campaign_id: campaign.id })));
    if (insertError) return NextResponse.json({ error: "Unable to deliver the campaign" }, { status: 500 });
    const { error: updateError } = await admin.from("period_campaigns").update({ reached_count: Number(campaign.reached_count ?? 0) + audience.length, sent_at: new Date().toISOString(), status: "completed" }).eq("id", campaign.id);
    if (updateError) return NextResponse.json({ error: "Campaign delivered but its status could not be updated" }, { status: 500 });
    await writeAudit(user.id, "dispatch", "period_campaign", campaign.id, { reached: audience.length, consentType, frequencyCapDays: capDays });
    return NextResponse.json({ ok: true, reached: audience.length });
  }

  if (input.action === "create_content") {
    if (unsafeHtml(input.bodyHtml)) return NextResponse.json({ error: "Content contains unsafe executable HTML" }, { status: 400 });
    const { data, error } = await admin.from("period_content").insert({
      title: input.title,
      topic: input.topic,
      content_type: input.contentType,
      locale: input.locale,
      summary: input.summary ?? null,
      body_html: input.bodyHtml,
      slug: `${slugify(input.title)}-${Date.now().toString(36)}`,
      tags: input.tags,
      cover_image_url: input.coverImageUrl ?? null,
      reading_minutes: input.readingMinutes ?? Math.max(1, Math.ceil(input.bodyHtml.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length / 220)),
      reading_level: input.readingLevel,
      featured: input.featured,
      status: "draft",
      created_by: user.id,
    }).select("id").single();
    if (error) return NextResponse.json({ error: "Unable to create content" }, { status: 500 });
    await writeAudit(user.id, "create", "period_content", data.id);
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  }

  if (input.action === "create_trivia_question") {
    let position: number | null = null;
    if (input.eventId) {
      const { count } = await admin.from("period_trivia_questions").select("id", { count: "exact", head: true }).eq("event_id", input.eventId);
      position = (count ?? 0) + 1;
    }
    // Group manual questions into one reviewable batch: reuse the admin's
    // most recent manual batch if it was started within the last hour,
    // otherwise start a new one. AI-generated batches use ai_job_id instead
    // (set at insert time in /api/ai-hub/period), so this only applies here.
    const { data: recentBatch } = await admin.from("period_trivia_questions")
      .select("manual_batch_id")
      .eq("created_by", user.id)
      .is("ai_job_id", null)
      .gte("created_at", new Date(Date.now() - 60 * 60000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const manualBatchId = recentBatch?.manual_batch_id ?? crypto.randomUUID();
    const { data, error } = await admin.from("period_trivia_questions").insert({ topic: input.topic, question: input.question, options: input.options, correct_option: input.correctOption, explanation: input.explanation, difficulty: input.difficulty, status: "draft", created_by: user.id, event_id: input.eventId ?? null, position, manual_batch_id: manualBatchId }).select("id").single();
    if (error) return NextResponse.json({ error: "Unable to create trivia question" }, { status: 500 });
    if (input.eventId && input.rewardId) {
      await admin.from("period_trivia_events").update({ reward_id: input.rewardId }).eq("id", input.eventId);
    }
    await writeAudit(user.id, "create", "period_trivia_question", data.id);
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  }

  if (input.action === "create_trivia_reward") {
    const { data, error } = await admin.from("period_trivia_rewards").insert({ name: input.name, description: input.description, icon: input.icon, reward_type: input.rewardType, value: input.value ?? null, created_by: user.id }).select("id").single();
    if (error) return NextResponse.json({ error: "Unable to create reward" }, { status: 500 });
    await writeAudit(user.id, "create", "period_trivia_reward", data.id);
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  }

  if (input.action === "create_trivia_event") {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (endsAt <= startsAt) return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    const formatter = new Intl.DateTimeFormat("en-US", { timeZone: input.timezone, weekday: "short" });
    if (formatter.format(startsAt) !== "Fri") return NextResponse.json({ error: "Friday Trivia must start on Friday in the selected timezone" }, { status: 400 });
    const slug = `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80)}-${startsAt.toISOString().slice(0, 10)}`;
    const { data, error } = await admin.from("period_trivia_events").insert({ title: input.title, slug, starts_at: input.startsAt, ends_at: input.endsAt, timezone: input.timezone, leaderboard_publish_at: input.endsAt, created_by: user.id, reward_id: input.rewardId ?? null }).select("id").single();
    if (error) return NextResponse.json({ error: "Unable to create Trivia schedule" }, { status: 500 });
    await writeAudit(user.id, "create", "period_trivia_event", data.id, { startsAt: input.startsAt, endsAt: input.endsAt });
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  }

  if (input.action === "review_trivia_event") {
    const { error } = await admin.rpc("review_period_trivia_event", { p_event_id: input.id, p_reviewer: user.id });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    await writeAudit(user.id, "review", "period_trivia_event", input.id);
    return NextResponse.json({ ok: true });
  }

  if (input.action === "update_trivia_question_status") {
    const published = input.status === "published";
    const { error } = await admin.from("period_trivia_questions").update({ status: input.status, validation_status: published ? "valid" : undefined, reviewed_by: published ? user.id : undefined, published_at: published ? new Date().toISOString() : null }).eq("id", input.id);
    if (error) return NextResponse.json({ error: "Unable to update Trivia question" }, { status: 500 });
    await writeAudit(user.id, `status:${input.status}`, "period_trivia_question", input.id);
    return NextResponse.json({ ok: true });
  }

  if (input.action === "bulk_update_trivia_question_status") {
    const published = input.status === "published";
    const { error } = await admin.from("period_trivia_questions").update({ status: input.status, validation_status: published ? "valid" : undefined, reviewed_by: published ? user.id : undefined, published_at: published ? new Date().toISOString() : null }).in("id", input.ids);
    if (error) return NextResponse.json({ error: "Unable to update Trivia questions" }, { status: 500 });
    await Promise.all(input.ids.map((id) => writeAudit(user.id, `status:${input.status}`, "period_trivia_question", id)));
    return NextResponse.json({ ok: true, count: input.ids.length });
  }

  if (input.action === "review_safety") {
    const final = ["resolved", "dismissed"].includes(input.resolution);
    const { error } = await admin.from("period_safety_flags").update({
      status: input.resolution,
      resolution_code: input.resolutionCode,
      resolved_at: final ? new Date().toISOString() : null,
      resolved_by: final ? user.id : null,
      assigned_to: user.id,
    }).eq("id", input.id);
    if (error) return NextResponse.json({ error: "Unable to update safety review" }, { status: 500 });
    await writeAudit(user.id, "review", "period_safety_flag", input.id, { resolution: input.resolution, resolutionCode: input.resolutionCode });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "review_note") {
    const final = ["cleared", "escalated"].includes(input.resolution);
    const { error } = await admin.from("period_notes").update({
      review_status: input.resolution,
      resolution_code: input.resolutionCode,
      assigned_to: user.id,
      reviewed_by: final ? user.id : null,
      reviewed_at: final ? new Date().toISOString() : null,
    }).eq("id", input.id);
    if (error) return NextResponse.json({ error: "Unable to update note review" }, { status: 500 });
    await writeAudit(user.id, "review", "period_note", input.id, { resolution: input.resolution, resolutionCode: input.resolutionCode });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "review_correction") {
    const { error } = await admin.rpc("review_period_cycle_revision", { p_revision_id: input.id, p_resolution: input.resolution, p_reviewer: user.id });
    if (error) return NextResponse.json({ error: "Unable to review correction" }, { status: 500 });
    await writeAudit(user.id, "review", "period_cycle_revision", input.id, { resolution: input.resolution });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "audit_export") {
    await writeAudit(user.id, "export", "period_tracker", input.scope, { rowCount: input.rowCount, reason: input.reason, containsDirectIdentifiers: false });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "update_content_status") {
    const publish = input.status === "published";
    if (publish) {
      const { data: content } = await admin.from("period_content").select("title,slug,summary,body_html,topic").eq("id", input.id).single();
      if (!content || unsafeHtml(content.body_html)) return NextResponse.json({ error: "Unsafe content cannot be published" }, { status: 400 });
      if (!content.summary?.trim() || !content.topic?.trim()) return NextResponse.json({ error: "A summary and topic are required before Library publication" }, { status: 400 });
      if (!content.slug) {
        const { error: slugError } = await admin.from("period_content").update({ slug: `${slugify(content.title)}-${input.id.slice(0, 8)}` }).eq("id", input.id);
        if (slugError) return NextResponse.json({ error: "Unable to create a unique Library address" }, { status: 500 });
      }
    }
    const { error } = await admin.from("period_content").update({ status: input.status, reviewed_by: publish ? user.id : undefined, clinical_reviewed_at: publish ? new Date().toISOString() : undefined, published_at: publish ? new Date().toISOString() : undefined }).eq("id", input.id);
    if (error) return NextResponse.json({ error: "Unable to update content" }, { status: 500 });
    await writeAudit(user.id, "status_change", "period_content", input.id, { status: input.status });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "create_content_collection") {
    const { data, error } = await admin.from("period_content_collections").insert({ title: input.title, slug: `${slugify(input.title)}-${Date.now().toString(36)}`, description: input.description ?? null, curation_type: input.curationType, created_by: user.id }).select("id").single();
    if (error) return NextResponse.json({ error: "Unable to create Library collection" }, { status: 500 });
    await writeAudit(user.id, "create", "period_content_collection", data.id);
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  }

  if (input.action === "add_content_to_collection") {
    const { data: content } = await admin.from("period_content").select("status").eq("id", input.contentId).maybeSingle();
    if (!content) return NextResponse.json({ error: "Content was not found" }, { status: 404 });
    const { error } = await admin.from("period_content_collection_items").upsert({ collection_id: input.collectionId, content_id: input.contentId, reason: input.reason ?? null, display_order: input.displayOrder, added_by: user.id }, { onConflict: "collection_id,content_id" });
    if (error) return NextResponse.json({ error: "Unable to add content to the collection" }, { status: 500 });
    await writeAudit(user.id, "add_item", "period_content_collection", input.collectionId, { contentId: input.contentId });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "publish_content_collection") {
    const { data: items } = await admin.from("period_content_collection_items").select("content_id,period_content(status)").eq("collection_id", input.id);
    if (!(items ?? []).length || (items ?? []).some((item: any) => item.period_content?.status !== "published")) return NextResponse.json({ error: "Collections require at least one published Library item" }, { status: 409 });
    const { error } = await admin.from("period_content_collections").update({ status: "published", reviewed_by: user.id, published_at: new Date().toISOString() }).eq("id", input.id);
    if (error) return NextResponse.json({ error: "Unable to publish the collection" }, { status: 500 });
    await writeAudit(user.id, "publish", "period_content_collection", input.id);
    return NextResponse.json({ ok: true });
  }

  if (input.action === "update_campaign_status") {
    const { data: campaign, error: campaignError } = await admin.from("period_campaigns").select("id,status,target_definition,minimum_cohort_size,scheduled_at").eq("id", input.id).single();
    if (campaignError || !campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    if (containsSensitiveAudience(campaign.target_definition)) return NextResponse.json({ error: "Campaign contains a prohibited sensitive audience" }, { status: 400 });
    if (input.status === "scheduled") {
      if (!campaign.scheduled_at || new Date(campaign.scheduled_at) <= new Date()) return NextResponse.json({ error: "A future schedule is required before approval" }, { status: 400 });
      const { data: consentRows } = await admin.from("period_consent_events").select("user_id,consent_type,granted,policy_version,source,created_at").eq("consent_type", "marketing").order("created_at", { ascending: false }).limit(10000);
      const latest = latestConsents((consentRows ?? []) as ConsentRecord[]);
      let eligible = [...latest.entries()].filter(([, values]) => values.get("marketing")?.granted).map(([userId]) => userId);
      const region = campaign.target_definition?.region;
      if (region && eligible.length) {
        const { data: eligibleProfiles } = await admin.from("user_profiles").select("user_id,region").in("user_id", eligible);
        eligible = (eligibleProfiles ?? []).filter((profile) => profile.region === region).map((profile) => profile.user_id);
      }
      if (eligible.length < Number(campaign.minimum_cohort_size)) return NextResponse.json({ error: "Consent-safe audience is below the minimum cohort size" }, { status: 409 });
    }
    const { error } = await admin.from("period_campaigns").update({ status: input.status, approved_by: input.status === "scheduled" ? user.id : undefined, approved_at: input.status === "scheduled" ? new Date().toISOString() : undefined }).eq("id", input.id);
    if (error) return NextResponse.json({ error: "Unable to update campaign" }, { status: 500 });
    await writeAudit(user.id, "status_change", "period_campaign", input.id, { status: input.status });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "update_privacy_request") {
    const { error } = await admin.from("period_privacy_requests").update({ status: input.status, assigned_to: user.id, completed_at: input.status === "completed" ? new Date().toISOString() : null }).eq("id", input.id);
    if (error) return NextResponse.json({ error: "Unable to update privacy request" }, { status: 500 });
    await writeAudit(user.id, "status_change", "period_privacy_request", input.id, { status: input.status });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "update_feature_flag") {
    const { error } = await admin.from("period_feature_flags").update({ enabled: input.enabled, rollout_percent: input.rolloutPercent, updated_by: user.id }).eq("key", input.key);
    if (error) return NextResponse.json({ error: "Unable to update feature flag" }, { status: 500 });
    await writeAudit(user.id, "rollout_change", "period_feature_flag", input.key, { enabled: input.enabled, rolloutPercent: input.rolloutPercent });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "grant_premium") {
    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + input.durationDays * 86400000);
    const { data, error } = await admin.from("period_premium_grants").insert({
      user_id: input.userId,
      tier: input.tier,
      source: input.source,
      reason: input.reason,
      notes: input.notes ?? null,
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      granted_by: user.id,
    }).select("id").single();
    if (error) return NextResponse.json({ error: "Unable to grant premium access" }, { status: 500 });
    await writeAudit(user.id, "grant", "period_premium_grant", data.id, { userId: input.userId, tier: input.tier, durationDays: input.durationDays, reason: input.reason });
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  }

  if (input.action === "extend_premium_grant") {
    const { data: grant } = await admin.from("period_premium_grants").select("id,starts_at,expires_at,revoked_at").eq("id", input.id).maybeSingle();
    if (!grant) return NextResponse.json({ error: "Grant not found" }, { status: 404 });
    if (grant.revoked_at) return NextResponse.json({ error: "Revoked grants cannot be extended" }, { status: 409 });
    const baseMs = Math.max(Date.now(), new Date(grant.expires_at).getTime());
    const expiresAt = new Date(baseMs + input.days * 86400000);
    const capMs = new Date(grant.starts_at).getTime() + 90 * 86400000;
    if (expiresAt.getTime() > capMs) return NextResponse.json({ error: "Duration cap exceeded — grants cannot run longer than 90 days from their start" }, { status: 400 });
    const { error } = await admin.from("period_premium_grants").update({ expires_at: expiresAt.toISOString() }).eq("id", input.id);
    if (error) return NextResponse.json({ error: "Unable to extend the grant" }, { status: 500 });
    await writeAudit(user.id, "extend", "period_premium_grant", input.id, { days: input.days, expiresAt: expiresAt.toISOString() });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "revoke_premium_grant") {
    const { error } = await admin.from("period_premium_grants").update({ revoked_at: new Date().toISOString(), revoked_by: user.id }).eq("id", input.id).is("revoked_at", null);
    if (error) return NextResponse.json({ error: "Unable to revoke the grant" }, { status: 500 });
    await writeAudit(user.id, "revoke", "period_premium_grant", input.id);
    return NextResponse.json({ ok: true });
  }

  if (input.action === "update_premium_settings") {
    const { error } = await admin.from("period_premium_settings").update({
      onboarding_trial_days: input.onboardingTrialDays,
      expiry_reminder_days: input.expiryReminderDays,
      auto_lock_on_expiry: input.autoLockOnExpiry,
      show_paywall_on_expiry: input.showPaywallOnExpiry,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
    if (error) return NextResponse.json({ error: "Unable to update premium settings" }, { status: 500 });
    await writeAudit(user.id, "update", "period_premium_settings", "singleton", { onboardingTrialDays: input.onboardingTrialDays });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "create_fulfillment") {
    const { data, error } = await admin.from("period_trivia_fulfillment").insert({
      event_id: input.eventId,
      submission_id: input.submissionId ?? null,
      tier_label: input.tierLabel,
      reward_id: input.rewardId ?? null,
      notes: input.notes ?? null,
    }).select("id").single();
    if (error) return NextResponse.json({ error: "Unable to create the fulfillment entry" }, { status: 500 });
    await writeAudit(user.id, "create", "period_trivia_fulfillment", data.id, { eventId: input.eventId, tierLabel: input.tierLabel });
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  }

  if (input.action === "mark_fulfillment_sent") {
    const { data: entry } = await admin.from("period_trivia_fulfillment").select("id,prize_status").eq("id", input.id).maybeSingle();
    if (!entry) return NextResponse.json({ error: "Fulfillment entry not found" }, { status: 404 });
    if (entry.prize_status === "fulfilled") return NextResponse.json({ error: "Fulfilled prizes cannot move back to sent" }, { status: 409 });
    const now = new Date().toISOString();
    // Marking sent fires the in-app fulfillment prompt for the winner.
    const { error } = await admin.from("period_trivia_fulfillment").update({ prize_status: "sent", sent_at: now, sent_by: user.id, prompt_sent_at: now }).eq("id", input.id);
    if (error) return NextResponse.json({ error: "Unable to mark the prize as sent" }, { status: 500 });
    await writeAudit(user.id, "send", "period_trivia_fulfillment", input.id);
    return NextResponse.json({ ok: true });
  }

  if (input.action === "mark_fulfillment_fulfilled") {
    const { data: entry } = await admin.from("period_trivia_fulfillment").select("id,prize_status").eq("id", input.id).maybeSingle();
    if (!entry) return NextResponse.json({ error: "Fulfillment entry not found" }, { status: 404 });
    if (entry.prize_status === "pending") return NextResponse.json({ error: "Mark the prize as sent before fulfilling it" }, { status: 409 });
    const now = new Date().toISOString();
    const { error } = await admin.from("period_trivia_fulfillment").update({ prize_status: "fulfilled", confirmed_at: now, fulfilled_at: now, fulfilled_by: user.id }).eq("id", input.id);
    if (error) return NextResponse.json({ error: "Unable to mark the prize as fulfilled" }, { status: 500 });
    await writeAudit(user.id, "fulfill", "period_trivia_fulfillment", input.id);
    return NextResponse.json({ ok: true });
  }

  if (input.action === "block_trivia_device") {
    const { data, error } = await admin.from("period_trivia_blocked_devices").insert({
      device_hash: input.deviceHash,
      mobile_hash: input.mobileHash ?? null,
      user_id: input.userId ?? null,
      violation: input.violation,
      evidence: input.evidence ?? null,
      status: input.status,
      blocked_by: input.status === "blocked" ? user.id : null,
    }).select("id").single();
    if (error) return NextResponse.json({ error: "Unable to record the block" }, { status: 500 });
    await writeAudit(user.id, input.status === "blocked" ? "block" : "flag", "period_trivia_blocked_device", data.id, { violation: input.violation });
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  }

  if (input.action === "unblock_trivia_device") {
    const { error } = await admin.from("period_trivia_blocked_devices").update({ status: "unblocked", unblocked_at: new Date().toISOString(), unblocked_by: user.id }).eq("id", input.id);
    if (error) return NextResponse.json({ error: "Unable to unblock the device" }, { status: 500 });
    await writeAudit(user.id, "unblock", "period_trivia_blocked_device", input.id);
    return NextResponse.json({ ok: true });
  }

  if (input.action === "update_trivia_rule") {
    const { error } = await admin.from("period_trivia_rules").update({ value: input.value, is_active: input.isActive, updated_by: user.id, updated_at: new Date().toISOString() }).eq("key", input.key);
    if (error) return NextResponse.json({ error: "Unable to update the trivia rule" }, { status: 500 });
    await writeAudit(user.id, "update", "period_trivia_rule", input.key, { value: input.value, isActive: input.isActive });
    return NextResponse.json({ ok: true });
  }

  if (input.action === "schedule_ai_suggestion") {
    const { data: job } = await admin.from("period_ai_jobs").select("id,status,job_type").eq("id", input.jobId).maybeSingle();
    if (!job) return NextResponse.json({ error: "AI suggestion not found" }, { status: 404 });
    if (!["content_suggestion", "content_curation"].includes(job.job_type)) return NextResponse.json({ error: "Only content suggestion jobs can be scheduled" }, { status: 400 });
    const { error } = await admin.from("period_ai_jobs").update({ scheduled_at: input.scheduledAt, frequency_cap_days: input.frequencyCapDays, surface_duration_weeks: input.surfaceDurationWeeks, surface_channel: input.surfaceChannel, scheduled_by: user.id }).eq("id", input.jobId);
    if (error) return NextResponse.json({ error: "Unable to schedule the suggestion" }, { status: 500 });
    await writeAudit(user.id, "schedule", "period_ai_job", input.jobId, { scheduledAt: input.scheduledAt, frequencyCapDays: input.frequencyCapDays });
    return NextResponse.json({ ok: true });
  }

  const { error } = await admin.from("period_ai_model_metrics").update({ status: input.status }).eq("id", input.id);
  if (error) return NextResponse.json({ error: "Unable to update forecast model" }, { status: 500 });
  await writeAudit(user.id, "status_change", "period_forecast_model", input.id, { status: input.status });
  return NextResponse.json({ ok: true });
}
