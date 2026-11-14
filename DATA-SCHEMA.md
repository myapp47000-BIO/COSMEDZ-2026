# COSMADEDZ — Data contract

All data files are plain browser scripts (no modules, no build step), UTF-8 encoded.
Each file declares exactly one global:

```js
(function (g) {
  "use strict";
  g.COSMA_MATERIALS = [ /* ... */ ];
})(window);
```

Rules for every string:
- Wrap strings in double quotes. Never use a raw double quote inside text; use « » instead.
- French apostrophes (l'huile, d'eau) are allowed inside double-quoted strings.
- No HTML tags inside data, no `<script>`, no external URLs.
- Keep numeric fields numeric, booleans boolean.
- Valid JavaScript at all times (test mentally: commas between objects, no trailing comma after last property).

## Category IDs (fixed, used by materials)

| id | Arabic title | French |
|---|---|---|
| emollients | المطريات والزيوت | Émollients & huiles |
| butters | الشموع والزبدات | Beurres & cires |
| emulsifiers | المستحلبات | Émulsifiants |
| surfactants | المنظفات | Tensioactifs |
| humectants | المرطبات | Humectants |
| thickeners | المثخنات | Épaississants |
| preservatives | الحافظات | Conservateurs |
| antioxidants | مضادات الأكسدة | Antioxydants |
| uv | واقيات الشمس | Filtres UV |
| silicones | السيليكونات | Silicones |
| actives | المواد الفعالة | Actifs |
| botanicals | المستخلصات النباتية | Extraits botaniques |
| exfoliants | المقشرات والطينات | Exfoliants & argiles |
| ph | منظمات الحموضة والعوامل المخلبية | pH & chélatants |
| sensory | محسنات الإحساس | Modificateurs sensoriels |
| solvents | المذيبات والحوامل | Solvants & vecteurs |
| fragrance | العطور | Parfums |
| colorants | الملونات | Colorants |

## COSMA_CATEGORIES

```js
{
  id: "emollients",
  title: "المطريات والزيوت",
  fr: "Émollients & huiles",
  icon: "drop",              // drop | butter | blend | bubbles | water | layers | shield | sun | silicone | star | leaf | grain | scale | sparkle | bottle | flower | palette
  color: "#c98a5b",           // hex accent
  desc: "جملة تعريفية مهنية عن الدور الوظيفي للعائلة.",
  ul: "كيف تصنف هذه العائلة في منصات المواد الأولية مثل ULProspector.",
  key: ["نقطة مفتاحية", "نقطة مفتاحية", "نقطة مفتاحية"]
}
```

## COSMA_MATERIALS

```js
{
  id: "olive-oil",                  // slug anglais unique
  name: "زيت الزيتون",               // Arabic common name
  inci: "Olea Europaea Fruit Oil",   // INCI exactly
  fr: "Huile d'olive",
  cat: "emollients",                // one fixed category id
  tags: ["طبيعي", "نباتي", "غني بالأوليك"], // 2-4 short tags
  hlb: null,                        // number or null
  use: "5–100%",                    // recommended use range as text
  phase: "A",                       // A (heating water/oil), B (cool-down), C (heat-sensitive), any
  sol: "زيتي",                      // ماء | زيت | كحول | ماء/زيت
  origin: "نباتي",                  // نباتي | حيواني | معدني | تخليقي | حيوي
  feel: "غني، مغذٍ، يمتص ببطء",      // sensory description
  desc: "2–4 جمل مهنية: التركيب، الدور، الاستخدام.",
  benefits: ["فائدة", "فائدة", "فائدة"],
  caution: "تحذير أو ملاحظة صياغة واحدة.",
  algeria: "ملاحظة عن التوفر/البديل في السوق الجزائري.",
  alt: ["sunflower-oil"]            // ids of alternatives, may be []
}
```

## COSMA_RECIPES

```js
{
  id: "basic-moisturizer",
  title: "كريم مرطب خفيف",
  fr: "Crème hydratante légère",
  cat: "face",                      // face | body | hair | cleanse | sun | anhydrous | soap
  type: "o/w",                      // o/w | w/o | gel | anhydrous | surfactant | serum | soap
  diff: 1,                          // 1 easy, 2 intermediate, 3 advanced
  time: "45 دقيقة",
  batch: 100,                       // grams
  unit: "غ",
  ph: "5.0–5.5",
  shelf: "3 أشهر",
  packaging: "علبة هوائية 50 مل",
  skin: "البشرة العادية إلى الجافة",
  desc: "وصف مهني للهدف من التركيبة وإحساسها.",
  claims: ["ترطيب 24 ساعة", "سريع الامتصاص"],
  phases: [
    {
      name: "المرحلة A — المائية",
      temp: "70–75 °م",
      items: [
        { name: "ماء مقطر", inci: "Aqua", pct: 68, role: "وسط" }
      ]
    }
  ],
  steps: [
    { t: "تحضير المرحلة المائية", d: "تفصيل دقيق للخطوة.", time: "10 د", temp: "70 °م" }
  ],
  tips: ["نصيحة عملية"],
  warn: ["تحذير سلامة أو صياغة"],
  tests: ["اختبار pH", "اختبار الثبات"]
}
```

Constraints:
- The `pct` values of all phases must add up to exactly 100.
- Every recipe must be technically plausible, with realistic percentages and a preservation strategy.
- Mention phase temperatures consistently with the ingredients used.

## COSMA_MODULES

```js
{
  id: "m1",
  title: "أساسيات علم التجميل",
  fr: "Fondamentaux de la cosmétologie",
  icon: "book",
  color: "#b76e79",
  level: 1,
  duration: 90,                     // minutes
  desc: "وصف المسار.",
  objectives: ["هدف", "هدف", "هدف", "هدف"],
  lessons: ["l1", "l2"],            // ids present in COSMA_LESSONS
  quiz: "q1"                        // id present in COSMA_QUIZZES
}
```

## COSMA_LESSONS

```js
{
  id: "l1",
  mid: "m1",
  title: "ما هو مستحضر التجميل؟",
  fr: "Qu'est-ce qu'un cosmétique ?",
  time: 12,                         // minutes
  summary: "ملخص من سطرين.",
  blocks: [
    { type: "p", text: "فقرة." },
    { type: "h", text: "عنوان فرعي." },
    { type: "list", items: ["عنصر", "عنصر"] },
    { type: "steps", items: ["خطوة", "خطوة"] },
    { type: "table", head: ["عمود", "عمود"], rows: [["خلية", "خلية"]] },
    { type: "tip", title: "نصيحة", text: "نص." },
    { type: "warn", title: "تحذير", text: "نص." },
    { type: "key", items: ["خلاصة", "خلاصة"] }
  ],
  key: ["ما يجب تذكره", "ما يجب تذكره"]
}
```

## COSMA_QUIZZES

```js
{
  id: "q1",
  mid: "m1",
  title: "اختبار الأساسيات",
  desc: "وصف قصير.",
  questions: [
    {
      q: "السؤال؟",
      opts: ["خيار", "خيار", "خيار", "خيار"],
      a: 1,
      ex: "شرح الإجابة الصحيحة."
    }
  ]
}
```

## COSMA_GLOSSARY

```js
{
  ar: "مستحلب",
  fr: "Émulsion",
  en: "Emulsion",
  def: "تعريف مهني موجز.",
  cat: "تقنية"                      // تقنية | مادة | جودة | تشريع | تسويق
}
```

## COSMA_METHODS

```js
{
  id: "hot-emulsion",
  title: "المستحلبات الساخنة",
  fr: "Émulsion à chaud",
  icon: "flame",
  type: "o/w",
  time: "60–90 دقيقة",
  level: 2,
  desc: "وصف الطريقة ومتى تُستعمل.",
  equipment: ["ميزان حساس", "خلاط"],
  steps: [
    { t: "تسخين المرحلتين", d: "تفصيل.", ccp: "70–75 °م في المرحلتين" }
  ],
  defects: [
    { p: "انفصال الطور", c: "سبب وحل." }
  ],
  tips: ["نصيحة"],
  related: ["basic-moisturizer"]
}
```
