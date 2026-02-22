import { describe, it, expect } from "vitest";
import {
  evaluateGuess,
  getWordFromSeed,
  generateSeed,
  computeKeyStatuses,
} from "../lib/game-logic";

describe("evaluateGuess", () => {
  it("全文字正解の場合はすべてcorrect", () => {
    const result = evaluateGuess("アイウエオ", "アイウエオ");
    expect(result).toEqual(["correct", "correct", "correct", "correct", "correct"]);
  });

  it("全文字不一致の場合はすべてabsent", () => {
    const result = evaluateGuess("カキクケコ", "アイウエオ");
    expect(result).toEqual(["absent", "absent", "absent", "absent", "absent"]);
  });

  it("位置が違うが含まれる文字はpresent", () => {
    const result = evaluateGuess("アイウエオ", "オエウイア");
    // ウは位置も正解（3文字目）
    expect(result[2]).toBe("correct");
    // ア・イは含まれるが位置違い
    expect(result[0]).toBe("present");
    expect(result[1]).toBe("present");
  });

  it("重複文字の処理：答えに1つしかない文字を2回入力した場合", () => {
    // 答え: アイウエオ（アは1つ）
    // 推測: アアウエオ（アを2回）
    const result = evaluateGuess("アアウエオ", "アイウエオ");
    expect(result[0]).toBe("correct"); // 1つ目のアは正解
    expect(result[1]).toBe("absent");  // 2つ目のアは答えに残っていないのでabsent
    expect(result[2]).toBe("correct"); // ウは正解
  });

  it("5文字すべて正解", () => {
    const result = evaluateGuess("コッキョウ", "コッキョウ");
    expect(result).toEqual(["correct", "correct", "correct", "correct", "correct"]);
  });

  it("長音符（ー）を含む単語の判定", () => {
    const result = evaluateGuess("カレンダー", "カレンダー");
    expect(result).toEqual(["correct", "correct", "correct", "correct", "correct"]);
  });
});

describe("getWordFromSeed", () => {
  it("同じシードは同じ単語を返す", () => {
    const seed = "TESTABCD";
    const word1 = getWordFromSeed(seed);
    const word2 = getWordFromSeed(seed);
    expect(word1).toBe(word2);
  });

  it("返される単語は5文字", () => {
    const seeds = ["ABC123", "XYZ789", "HELLO1", "WORLD2", "JAPAN3"];
    for (const seed of seeds) {
      const word = getWordFromSeed(seed);
      expect(word.length).toBe(5);
    }
  });

  it("異なるシードは（ほぼ）異なる単語を返す", () => {
    const words = new Set<string>();
    for (let i = 0; i < 20; i++) {
      words.add(getWordFromSeed(`SEED${i.toString().padStart(4, "0")}`));
    }
    // 20個のシードで少なくとも5種類以上の単語が出る
    expect(words.size).toBeGreaterThan(5);
  });
});

describe("generateSeed", () => {
  it("シードは8文字の英数字（大文字）", () => {
    const seed = generateSeed();
    expect(seed.length).toBe(8);
    expect(seed).toMatch(/^[A-Z0-9]{8}$/);
  });

  it("連続して生成したシードは異なる", () => {
    const seeds = new Set<string>();
    for (let i = 0; i < 10; i++) {
      seeds.add(generateSeed());
    }
    expect(seeds.size).toBeGreaterThan(5);
  });
});

describe("computeKeyStatuses", () => {
  it("未使用のキーはstatusが設定されない", () => {
    const grid = Array.from({ length: 10 }, () =>
      Array.from({ length: 5 }, () => ({ char: "", status: "empty" as const }))
    );
    const statuses = computeKeyStatuses(grid, 0);
    expect(Object.keys(statuses).length).toBe(0);
  });

  it("correctはpresentより優先される", () => {
    const grid = [
      [
        { char: "ア", status: "present" as const },
        { char: "イ", status: "absent" as const },
        { char: "ウ", status: "absent" as const },
        { char: "エ", status: "absent" as const },
        { char: "オ", status: "absent" as const },
      ],
      [
        { char: "ア", status: "correct" as const },
        { char: "カ", status: "absent" as const },
        { char: "キ", status: "absent" as const },
        { char: "ク", status: "absent" as const },
        { char: "ケ", status: "absent" as const },
      ],
      ...Array.from({ length: 8 }, () =>
        Array.from({ length: 5 }, () => ({ char: "", status: "empty" as const }))
      ),
    ];
    const statuses = computeKeyStatuses(grid, 2);
    expect(statuses["ア"]).toBe("correct"); // correctがpresentより優先
    expect(statuses["イ"]).toBe("absent");
  });

  it("absentはpresentより低い優先度", () => {
    const grid = [
      [
        { char: "ア", status: "absent" as const },
        { char: "イ", status: "absent" as const },
        { char: "ウ", status: "absent" as const },
        { char: "エ", status: "absent" as const },
        { char: "オ", status: "absent" as const },
      ],
      [
        { char: "ア", status: "present" as const },
        { char: "カ", status: "absent" as const },
        { char: "キ", status: "absent" as const },
        { char: "ク", status: "absent" as const },
        { char: "ケ", status: "absent" as const },
      ],
      ...Array.from({ length: 8 }, () =>
        Array.from({ length: 5 }, () => ({ char: "", status: "empty" as const }))
      ),
    ];
    const statuses = computeKeyStatuses(grid, 2);
    expect(statuses["ア"]).toBe("present"); // presentがabsentより優先
  });
});
