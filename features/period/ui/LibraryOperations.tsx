"use client";

import React, { useState } from "react";
import { type PeriodTabId } from "@/features/period/schema/period-tracker";
import TopicCategorySelect from "./TopicCategorySelect";
import type { Row } from "@/features/period/schema/types";


export default function LibraryOperations({
  rows,
  collections,
  saving,
  mutate,
}: {
  rows: Row[];
  collections: Row[];
  saving: boolean;
  mutate: (body: any, message: string) => Promise<void>;
}) {
  const [showCollection, setShowCollection] = useState(false);
  const published = rows.filter((item) => item.status === "published");
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="card-title">Plasence Library connection</h3>
            <p className="mt-1 text-[10px] text-slate-500">
              Every clinically reviewed published item receives a live mobile
              publication automatically.
            </p>
          </div>
          <a
            className="btn btn-secondary btn-sm"
            href="/api/period/library"
            target="_blank"
            rel="noreferrer"
          >
            Preview feed
          </a>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <div className="text-xl font-semibold">{published.length}</div>
            <div className="text-[10px] text-slate-500">Published</div>
          </div>
          <div>
            <div className="text-xl font-semibold">
              {
                rows.filter((item) =>
                  ["live", "scheduled"].includes(item.libraryStatus),
                ).length
              }
            </div>
            <div className="text-[10px] text-slate-500">Mobile-visible</div>
          </div>
          <div>
            <div className="text-xl font-semibold">
              {rows.reduce(
                (sum, item) => sum + Number(item.sourceCount ?? 0),
                0,
              )}
            </div>
            <div className="text-[10px] text-slate-500">Source links</div>
          </div>
        </div>
      </section>
      <section className="card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="card-title">Curated collections</h3>
            <p className="mt-1 text-[10px] text-slate-500">
              Collections group published items without hiding them from All
              Content.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowCollection((value) => !value)}
            aria-expanded={showCollection}
          >
            {showCollection ? "Close" : "New collection"}
          </button>
        </div>
        {showCollection && (
          <form
            className="mt-4 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              mutate(
                {
                  action: "create_content_collection",
                  title: form.get("title"),
                  description: form.get("description") || undefined,
                  curationType: form.get("curationType"),
                },
                "Library collection draft created.",
              );
            }}
          >
            <label className="form-label">
              Title
              <input
                name="title"
                required
                minLength={2}
                maxLength={160}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-[11px]"
              />
            </label>
            <label className="form-label">
              Description
              <input
                name="description"
                maxLength={500}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-[11px]"
              />
            </label>
            <label className="form-label">
              Curation
              <select
                name="curationType"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-[11px]"
              >
                <option value="manual">Manual</option>
                <option value="ai_suggested">AI suggested</option>
                <option value="rule_based">Rule based</option>
              </select>
            </label>
            <button className="btn btn-primary btn-sm" disabled={saving}>
              Create collection
            </button>
          </form>
        )}
        {!!collections.length && !!published.length && (
          <form
            className="mt-4 grid gap-2 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              mutate(
                {
                  action: "add_content_to_collection",
                  collectionId: form.get("collectionId"),
                  contentId: form.get("contentId"),
                  reason: form.get("reason") || undefined,
                  displayOrder: 0,
                },
                "Published content added to the collection.",
              );
            }}
            aria-label="Add published content to a Library collection"
          >
            <label className="form-label">
              Collection
              <select
                name="collectionId"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-[11px]"
              >
                {collections.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-label">
              Published content
              <select
                name="contentId"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-[11px]"
              >
                {published.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-label sm:col-span-2">
              Curation reason
              <input
                name="reason"
                maxLength={300}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-[11px]"
                placeholder="Why this item belongs in the collection"
              />
            </label>
            <button
              className="btn btn-secondary btn-sm sm:col-span-2"
              disabled={saving}
            >
              Add to collection
            </button>
          </form>
        )}
        <div className="mt-4 space-y-2">
          {collections.slice(0, 5).map((collection) => (
            <div
              key={collection.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
            >
              <div>
                <div className="text-[11px] font-medium">{collection.title}</div>
                <div className="text-[10px] text-slate-500">
                  {collection.curation_type?.replaceAll("_", " ")} ·{" "}
                  {collection.period_content_collection_items?.length ?? 0}{" "}
                  items
                </div>
              </div>
              {collection.status === "draft" && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={saving}
                  onClick={() =>
                    mutate(
                      {
                        action: "publish_content_collection",
                        id: collection.id,
                      },
                      "Collection published to the Plasence Library.",
                    )
                  }
                >
                  Publish
                </button>
              )}
            </div>
          ))}
          {!collections.length && (
            <p className="text-[11px] text-slate-500">No collections yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

export function CreateForm({
  activeTab,
  events,
  rewards,
  saving,
  onSubmit,
  onCancel,
}: {
  activeTab: PeriodTabId;
  events: Row[];
  rewards: Row[];
  saving: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const campaign = activeTab === "engagement";
  const trivia = activeTab === "trivia";
  return (
    <form
      className="card space-y-3 p-4"
      onSubmit={onSubmit}
      aria-label={
        campaign
          ? "Create campaign draft"
          : trivia
            ? "Create trivia question draft"
            : "Create content draft"
      }
    >
      {trivia ? (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="form-label">
              Topic
              <input
                name="topic"
                required
                maxLength={100}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px]"
              />
            </label>
            <label className="form-label">
              Difficulty
              <select
                name="difficulty"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px]"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
          </div>
          <label className="form-label">
            Question
            <textarea
              name="question"
              required
              minLength={5}
              maxLength={500}
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px]"
            />
          </label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="form-label">
              Answer options, one per line
              <textarea
                name="options"
                required
                minLength={3}
                className="mt-1 min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px]"
              />
            </label>
            <label className="form-label">
              Correct answer number
              <input
                name="correctOption"
                required
                type="number"
                min="1"
                max="6"
                defaultValue="1"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px]"
              />
            </label>
          </div>
          <label className="form-label">
            Learning explanation
            <textarea
              name="explanation"
              required
              minLength={5}
              maxLength={2000}
              className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px]"
            />
          </label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="form-label">
              Attach to event (optional)
              <select
                name="eventId"
                defaultValue=""
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px]"
              >
                <option value="">Unattached draft</option>
                {events
                  .filter((item) => item.status === "draft")
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
              </select>
            </label>
            <label className="form-label">
              Reward for that event (optional)
              <select
                name="rewardId"
                defaultValue=""
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px]"
              >
                <option value="">No reward set</option>
                {rewards.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.icon} {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="form-label">
              {campaign ? "Campaign name" : "Title"}
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px]"
                name={campaign ? "name" : "title"}
                required
                maxLength={200}
              />
            </label>
            {campaign ? (
              <label className="form-label">
                Campaign type
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px]"
                  name="campaignType"
                  required
                  maxLength={100}
                />
              </label>
            ) : (
              <TopicCategorySelect name="topic" required />
            )}
            {campaign ? (
              <>
                <label className="form-label">
                  Channel
                  <select
                    name="channel"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px]"
                  >
                    <option value="in_app">In-app</option>
                    <option value="push">Push</option>
                    <option value="email">Email</option>
                  </select>
                </label>
                <label className="form-label">
                  Region only (optional)
                  <input
                    name="region"
                    maxLength={100}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px]"
                  />
                </label>
                <label className="form-label">
                  Minimum cohort
                  <input
                    name="minimumCohortSize"
                    type="number"
                    min="100"
                    defaultValue="100"
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px]"
                  />
                </label>
                <label className="form-label">
                  Frequency cap (days)
                  <input
                    name="frequencyCapDays"
                    type="number"
                    min="1"
                    max="90"
                    defaultValue="7"
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px]"
                  />
                </label>
                <label className="form-label">
                  Schedule (optional)
                  <input
                    name="scheduledAt"
                    type="datetime-local"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px]"
                  />
                </label>
                <label className="form-label">
                  Partner (optional)
                  <input
                    name="partnerName"
                    maxLength={160}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px]"
                  />
                </label>
              </>
            ) : (
              <>
                <label className="form-label">
                  Content type
                  <select
                    name="contentType"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px]"
                  >
                    <option value="article">Article</option>
                    <option value="quick_read">Quick read</option>
                    <option value="video">Video</option>
                    <option value="podcast">Podcast</option>
                    <option value="expert_qa">Expert Q&amp;A</option>
                  </select>
                </label>
                <label className="form-label">
                  Locale
                  <input
                    name="locale"
                    defaultValue="en"
                    required
                    maxLength={12}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px]"
                  />
                </label>
                <label className="form-label">
                  Tags, comma separated
                  <input
                    name="tags"
                    maxLength={500}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px]"
                    placeholder="cramps, nutrition, luteal"
                  />
                </label>
                <label className="form-label">
                  Cover image URL
                  <input
                    name="coverImageUrl"
                    type="url"
                    maxLength={2000}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px]"
                  />
                </label>
                <label className="form-label">
                  Reading minutes
                  <input
                    name="readingMinutes"
                    type="number"
                    min="1"
                    max="180"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px]"
                    placeholder="Auto"
                  />
                </label>
                <label className="form-label">
                  Reading level
                  <select
                    name="readingLevel"
                    defaultValue="general"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px]"
                  >
                    <option value="simple">Simple</option>
                    <option value="general">General</option>
                    <option value="detailed">Detailed</option>
                  </select>
                </label>
                <label className="form-label flex items-center gap-2 pt-6">
                  <input name="featured" type="checkbox" /> Feature in Library
                </label>
              </>
            )}
          </div>
          {!campaign && (
            <>
              <label className="form-label">
                Summary
                <textarea
                  name="summary"
                  maxLength={500}
                  className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px]"
                />
              </label>
              <label className="form-label">
                Content
                <textarea
                  name="bodyHtml"
                  required
                  maxLength={50000}
                  className="mt-1 min-h-32 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px]"
                />
              </label>
            </>
          )}
        </>
      )}
      <p className="text-[10px] text-slate-500">
        {campaign
          ? "Campaigns remain drafts until consent, cohort-size, frequency and approval checks pass. Health attributes are not accepted as audience filters."
          : trivia
            ? "Questions remain drafts until editorial and clinical review. Explanations are shown after answering."
            : "Publishing records a clinical review timestamp. Drafts are never exposed to users."}
      </p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save draft"}
        </button>
      </div>
    </form>
  );
}
