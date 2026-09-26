"use client";

import Link from "next/link";
import { type FormEvent, type ReactNode, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  LifeBuoy,
  LoaderCircle,
  MessageSquareText,
  Send,
  ShieldCheck,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const categories = [
  "Technical",
  "Account",
  "Billing",
  "Health Consultation",
  "BedTracker",
  "Other",
] as const;

type SupportCategory = (typeof categories)[number];

export default function SupportPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<SupportCategory>("Technical");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setTicketId(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, category, message }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "We could not submit your request.");

      setTicketId(Number(body?.ticket?.id));
      setSubject("");
      setMessage("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We could not submit your request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-slate-50 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
            4 Our Life
          </Link>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Link href="/privacy-policy" className="hover:text-emerald-700 dark:hover:text-emerald-400">
              Privacy policy
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/login" className="hover:text-emerald-700 dark:hover:text-emerald-400">
              Office sign in
            </Link>
          </div>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10">
          <section className="space-y-6 py-3 lg:py-10">
            <Badge variant="emerald" className="px-3 py-1 text-2xs">
              Support centre
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-xl text-3xl font-black tracking-tight">
                Tell us how we can help.
              </h1>
              <p className="max-w-lg text-base leading-7 text-slate-600 dark:text-slate-300">
                Send a request to the 4 Our Life team. Your submission is recorded securely and routed to our support queue.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <InfoCard icon={MessageSquareText} title="One support queue">
                Requests from the website and app are handled together, so context does not get lost.
              </InfoCard>
              <InfoCard icon={ShieldCheck} title="Share only what is needed">
                Do not include passwords, payment card details, or urgent medical information in this form.
              </InfoCard>
            </div>

            <Link
              href="/privacy-policy"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              How we handle your information <ArrowUpRight className="size-4" />
            </Link>
          </section>

          <Card className="border-slate-200/80 bg-white shadow-xl shadow-slate-950/[0.04] dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                  <LifeBuoy className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Submit a support request</CardTitle>
                  <CardDescription>We will use your email address only to respond about this request.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 sm:p-8">
              {ticketId ? (
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-100">
                  <CheckCircle2 className="size-4" />
                  <AlertTitle>Request received</AlertTitle>
                  <AlertDescription>
                    Your reference is <strong>TKT-{String(ticketId).padStart(4, "0")}</strong>. Keep this for your records; we will reply to {email}.
                  </AlertDescription>
                </Alert>
              ) : null}
              {error ? (
                <Alert variant="destructive" className="mb-6">
                  <AlertTitle>Could not submit your request</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <form className="mt-1" onSubmit={submit}>
                <FieldGroup>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="support-name">Your name</FieldLabel>
                      <Input id="support-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="support-email">Email address</FieldLabel>
                      <Input id="support-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="support-subject">What do you need help with?</FieldLabel>
                    <Input id="support-subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={160} required />
                  </Field>
                  <Field>
                    <FieldLabel>Request type</FieldLabel>
                    <Select value={category} onValueChange={(value) => setCategory(value as SupportCategory)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="support-message">Tell us more</FieldLabel>
                    <Textarea id="support-message" value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={5000} rows={7} required />
                    <FieldDescription>Include what happened, when it happened, and any non-sensitive details that can help us investigate.</FieldDescription>
                  </Field>
                  <Button type="submit" variant="emerald" size="lg" disabled={submitting} className="w-full sm:w-auto">
                    {submitting ? <LoaderCircle className="animate-spin" /> : <Send />}
                    {submitting ? "Submitting…" : "Submit request"}
                  </Button>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function InfoCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof LifeBuoy;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <Icon className="mb-3 size-5 text-emerald-600 dark:text-emerald-400" />
      <h2 className="font-bold">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{children}</p>
    </div>
  );
}
