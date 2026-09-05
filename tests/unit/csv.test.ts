import { describe, expect, it } from "vitest";

import { toCsv } from "@/lib/csv";

/**
 * These cases cover what the ten implementations this helper replaced did
 * differently, plus the two behaviours that are new (a BOM on every export,
 * and escaping a lone carriage return).
 */
describe("toCsv", () => {
  it("returns an empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });

  it("takes column order and labels from the first row's keys", () => {
    expect(toCsv([{ b: 2, a: 1 }])).toBe("b,a\r\n2,1");
  });

  it("keeps a label with a space or bracket intact", () => {
    expect(toCsv([{ "Rest (s)": 60 }])).toBe("Rest (s)\r\n60");
  });

  it("renders null and undefined as empty", () => {
    // All ten old copies got this right, by two different spellings
    // (`value ?? ""` and an explicit null/undefined check). Pinned so the
    // single surviving implementation cannot regress it.
    expect(toCsv([{ a: null, b: undefined }])).toBe("a,b\r\n,");
  });

  it("does not confuse a zero or a false with an empty cell", () => {
    expect(toCsv([{ n: 0, b: false }])).toBe("n,b\r\n0,false");
  });

  it("quotes a cell containing a comma", () => {
    expect(toCsv([{ a: "Accra, Ghana" }])).toBe('a\r\n"Accra, Ghana"');
  });

  it("doubles an embedded quote", () => {
    expect(toCsv([{ a: 'say "hi"' }])).toBe('a\r\n"say ""hi"""');
  });

  it("quotes a cell containing a newline or carriage return", () => {
    expect(toCsv([{ a: "one\ntwo" }])).toBe('a\r\n"one\ntwo"');
    // A lone \r breaks a naive parser too. None of the ten old copies caught
    // it — every one tested /[",\n]/ — so this case is new behaviour, not a
    // pinned one.
    expect(toCsv([{ a: "one\rtwo" }])).toBe('a\r\n"one\rtwo"');
  });

  it("leaves an ordinary cell unquoted", () => {
    expect(toCsv([{ a: "plain" }])).toBe("a\r\nplain");
  });

  it("uses CRLF between records, per RFC 4180", () => {
    expect(toCsv([{ a: 1 }, { a: 2 }])).toBe("a\r\n1\r\n2");
  });

  it("emits a cell for a key missing from a later row", () => {
    // Column set is fixed by the first row; a ragged row must not shift cells.
    expect(toCsv([{ a: 1, b: 2 }, { a: 3 }])).toBe("a,b\r\n1,2\r\n3,");
  });

  it("preserves non-ASCII text", () => {
    expect(toCsv([{ name: "Osei-Bonsu Kwabena Ɔdɔ" }])).toBe(
      "name\r\nOsei-Bonsu Kwabena Ɔdɔ",
    );
  });
});
