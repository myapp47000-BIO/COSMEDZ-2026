/* ============================================================
   COSMADEDZ — Pages: recipes, lab, quality, glossary, methods, quizzes, profile, about
   ============================================================ */
(function () {
  "use strict";

  var C = window.cosd;
  if (!C) return;
  var P = C.PAGES;
  var D = C.D;
  var S = C.S;
  var store = C.store;
  var esc = C.esc, inline = C.inline, fmt = C.fmt, ic = C.ic;
  var crumbs = C.crumbs, pageHead = C.pageHead, ring = C.ring;
  var favButton = C.favButton, recipeCard = C.recipeCard, notFound = C.notFound;
  var byId = C.byId, recipeOf = C.recipeOf, matOf = C.matOf, moduleOf = C.moduleOf;
  var moduleLessons = C.moduleLessons, modulePct = C.modulePct, moduleColor = C.moduleColor;
  var diffLabel = C.diffLabel, diffStars = C.diffStars, stars = C.stars;
  var typeLabel = C.typeLabel, recipeCatLabel = C.recipeCatLabel, phaseName = C.phaseName;
  var renderBlocks = C.renderBlocks, normText = C.normText, toast = C.toast;
  var overallPct = C.overallPct, doneLessons = C.doneLessons, totalLessons = C.totalLessons;
  var nextLesson = C.nextLesson, passedQuizCount = C.passedQuizCount, isEligible = C.isEligible;
  var saveLessons = C.saveLessons, saveQuiz = C.saveQuiz, renderRoute = C.renderRoute;
  var t = function (msg) { return C.I18N ? C.I18N.t(msg) : msg; };
  var tf = function (msg, vars) { return C.I18N ? C.I18N.tf(msg, vars) : msg; };

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function pctSum(r) { var s=0; (r.phases||[]).forEach(function(ph){ (ph.items||[]).forEach(function(it){ s += Number(it.pct)||0; }); }); return Math.round(s*100)/100; }

  /* ---------- Recipes list ---------- */
  P.recipes = function (params, query) {
    var q0 = (query && query.get("q")) || "";
    var cat0 = (query && query.get("cat")) || "all";
    var cats = [{id:"all", label:"الكل"}];
    var seen = {};
    D.recipes.forEach(function(r){ if (r.cat && !seen[r.cat]) { seen[r.cat]=1; cats.push({id:r.cat, label:recipeCatLabel(r.cat)}); } });
    var html = crumbs([{label:"الرئيسية", href:"#/home"}, {label:"الوصفات"}]) +
      pageHead("دفتر التركيبات", "وصفات <span class='accent'>آلية ومحسوبة</span>",
        "كل وصفة تحتوي على المراحل، النسب، طريقة التحضير، درجة الحموضة، الحفظ، واختبارات القبول. استخدم حاسبة الدفعة لتحويلها إلى غرامات.",
        '<span class="tag tag-rose" style="padding:6px 12px">' + fmt(D.recipes.length) + ' وصفة</span>') +
      '<div class="toolbar"><div class="search-input-wrap">' + ic("search") + '<input class="input" id="recSearch" type="search" placeholder="ابحث في الوصفات…" value="' + esc(q0) + '"></div><div class="result-count" id="recCount"></div></div>' +
      '<div class="chips" style="margin-bottom:16px">' + cats.map(function(c){ return '<button class="chip' + (c.id===cat0?' is-active':'') + '" data-rec-cat="' + esc(c.id) + '">' + esc(c.label) + '</button>'; }).join("") + '</div>' +
      '<h2 class="sr-only">قائمة الوصفات</h2>' +
      '<div class="card-grid" id="recList"></div>';
    function apply() {
      var q = qs("#recSearch") ? qs("#recSearch").value : "";
      var ac = qs(".chip.is-active[data-rec-cat]");
      var cat = ac ? ac.getAttribute("data-rec-cat") : "all";
      var n = normText(q);
      var arr = D.recipes.filter(function(r){
        if (cat !== "all" && r.cat !== cat) return false;
        if (!n) return true;
        var hay = normText([r.title, r.fr, r.desc, r.skin, (r.claims||[]).join(" ")].join(" "));
        return n.split(/\s+/).every(function(w){ return hay.indexOf(w) >= 0; });
      });
      var box = qs("#recList");
      if (box) box.innerHTML = arr.length ? arr.map(function(r){ return recipeCard(r); }).join("") : '<div class="empty-state" style="grid-column:1/-1"><div class="es-ico">' + ic("search") + '</div><h2>لا توجد وصفات مطابقة</h2><p>جرّب كلمة أخرى أو تصنيفاً مختلفاً.</p></div>';
      var cnt = qs("#recCount"); if (cnt) cnt.textContent = fmt(arr.length) + ' وصفة';
    }
    function after() {
      apply();
      var inp = qs("#recSearch"); if (inp) inp.addEventListener("input", apply);
      qsa("[data-rec-cat]").forEach(function(ch){ ch.addEventListener("click", function(){ qsa("[data-rec-cat]").forEach(function(x){ x.classList.remove("is-active"); }); ch.classList.add("is-active"); apply(); }); });
    }
    return { html: html, after: after };
  };

  /* ---------- Recipe detail ---------- */
  P.recipe = function (params) {
    var r = recipeOf(params.id);
    if (!r) return notFound("الوصفة");
    var method = r.method ? byId(D.methods, r.method) : null;
    var batch = Number(r.batch) || 100;
    var sum = pctSum(r);
    var phasesHtml = (r.phases || []).map(function(ph){
      return '<div class="phase"><div class="phase-head"><h3>' + esc(ph.name) + '</h3><span>' + esc(ph.temp || "") + '</span></div>' +
        '<div class="table-wrap"><table class="table ing-table"><thead><tr><th>المادة</th><th>INCI</th><th>الدور</th><th>النسبة %</th><th>الكمية (غ)</th></tr></thead><tbody>' +
        (ph.items || []).map(function(it){
          var mat = it.inci ? D.materials.find(function(m){ return m.inci === it.inci; }) : null;
          var name = mat ? '<a href="#/material/' + mat.id + '">' + esc(it.name) + '</a>' : esc(it.name);
          return '<tr data-pct="' + (Number(it.pct)||0) + '"><td><strong>' + name + '</strong></td><td class="inci">' + esc(it.inci||"—") + '</td><td>' + esc(it.role||"—") + '</td><td class="num">' + fmt(it.pct) + '%</td><td class="num"><span class="batch-qty">' + fmt(Math.round((Number(it.pct)||0)*batch)/100) + '</span> غ</td></tr>';
        }).join("") + '</tbody></table></div></div>';
    }).join("");

    var html = crumbs([{label:"الرئيسية", href:"#/home"}, {label:"الوصفات", href:"#/recipes"}, {label:r.title}]) +
      '<section class="detail-hero" style="--accent:#b76e79">' +
      '<div class="detail-hero-top"><div><span class="eyebrow">' + esc(recipeCatLabel(r.cat)) + ' · ' + esc(typeLabel(r.type)) + ' · ' + esc(diffLabel(r.diff)) + '</span><h1>' + esc(r.title) + '</h1><div class="fr">' + esc(r.fr||"") + '</div></div>' +
      '<div class="detail-actions">' + favButton('recipe:'+r.id) + '<button class="icon-btn" id="printRecipe" title="طباعة">' + ic("printer") + '</button></div></div>' +
      '<p class="lead">' + inline(r.desc||"") + '</p>' +
      '<div class="meta-grid"><div class="meta-item"><span>الدفعة المرجعية</span><strong>' + fmt(batch) + ' ' + esc(r.unit||"غ") + '</strong></div><div class="meta-item"><span>الوقت</span><strong>' + esc(r.time||"—") + '</strong></div><div class="meta-item"><span>pH المستهدف</span><strong class="mono">' + esc(r.ph||"—") + '</strong></div><div class="meta-item"><span>مدة الصلاحية</span><strong>' + esc(r.shelf||"—") + '</strong></div></div>' +
      '</section>' +
      '<div class="detail-grid"><div>' +
      '<div class="panel"><h2>' + ic("layers") + ' المراحل والمكونات</h2>' +
      (sum !== 100 ? '<div class="callout callout-warn">' + ic("alert") + '<div><strong>تنبيه مجموع النسب</strong><p>مجموع النسب الحالي ' + fmt(sum) + '% (يفضل 100%). تحقّق من الصيغة قبل التنفيذ.</p></div></div>' : '') +
      phasesHtml + '</div>' +
      '<div class="panel" style="margin-top:16px"><h2>' + ic("list") + ' خطوات التحضير</h2><div class="step-list">' + (r.steps||[]).map(function(s,i){ return '<div class="step-item"><span class="step-dot">' + fmt(i+1) + '</span><div class="step-copy"><strong>' + esc(s.t||('الخطوة '+(i+1))) + '</strong><p>' + inline(s.d||"") + '</p>' + ((s.time||s.temp)?'<div class="tiny muted" style="margin-top:4px">' + esc([s.time,s.temp].filter(Boolean).join(' · ')) + '</div>':'') + '</div></div>'; }).join("") + '</div></div>' +
      ((r.tips&&r.tips.length)?'<div class="panel" style="margin-top:16px"><h2>' + ic("sparkle") + ' نصائح</h2><ul class="bullet-list">' + r.tips.map(function(t){ return '<li>'+inline(t)+'</li>'; }).join("") + '</ul></div>':'') +
      ((r.warn&&r.warn.length)?'<div class="panel" style="margin-top:16px"><h2>' + ic("alert") + ' تحذيرات</h2><ul class="bullet-list">' + r.warn.map(function(t){ return '<li>'+inline(t)+'</li>'; }).join("") + '</ul></div>':'') +
      '</div><aside class="sticky-side">' +
      '<div class="panel"><h2>' + ic("flask") + ' حاسبة الدفعة</h2><label class="field"><span>حجم الدفعة (غ)</span><input id="batchInput" class="input" type="number" min="1" step="1" value="' + batch + '"></label>' +
      '<div class="result-list" style="margin-top:10px"><div><span>المجموع</span><b id="batchSum">' + fmt(sum) + '%</b></div></div>' +
      '<button class="btn btn-soft btn-block" style="margin-top:10px" id="copyRecipe">' + ic("copy") + ' نسخ الصيغة</button></div>' +
      '<div class="panel"><h2>' + ic("info") + ' بطاقة الوصفة</h2><div class="result-list"><div><span>التغليف</span><b>' + esc(r.packaging||"—") + '</b></div><div><span>مناسب لـ</span><b>' + esc(r.skin||"—") + '</b></div><div><span>الحفظ</span><b>' + esc(r.shelf||"—") + '</b></div><div><span>pH</span><b class="mono">' + esc(r.ph||"—") + '</b></div></div>' +
      ((r.claims&&r.claims.length)?'<div class="chips" style="margin-top:10px">' + r.claims.map(function(c){ return '<span class="chip">'+esc(c)+'</span>'; }).join("") + '</div>':'') + '</div>' +
      (method ? '<div class="panel"><h2>' + ic("flame") + ' طريقة مقترحة</h2><p class="small">' + esc(method.desc||"") + '</p><a class="btn btn-ghost btn-block" style="margin-top:10px" href="#/method/' + method.id + '">دليل الطريقة ' + ic("arrowLeft") + '</a></div>' : '') +
      ((r.tests&&r.tests.length)?'<div class="panel"><h2>' + ic("target") + ' اختبارات القبول</h2><ul class="bullet-list">' + r.tests.map(function(t){ return '<li>'+esc(t)+'</li>'; }).join("") + '</ul></div>':'') +
      '</aside></div>';

    function after() {
      var inp = qs("#batchInput");
      function recalc() {
        var b = Math.max(1, Number(inp && inp.value) || batch);
        qsa(".ing-table tbody tr").forEach(function(tr){
          var p = Number(tr.getAttribute("data-pct"))||0;
          var q = tr.querySelector(".batch-qty");
          if (q) q.textContent = fmt(Math.round(p*b)/100);
        });
      }
      if (inp) inp.addEventListener("input", recalc);
      var pr = qs("#printRecipe"); if (pr) pr.addEventListener("click", function(){ document.body.classList.add("printing-recipe"); window.print(); setTimeout(function(){ document.body.classList.remove("printing-recipe"); }, 500); });
      var cp = qs("#copyRecipe"); if (cp) cp.addEventListener("click", function(){
        var b = Math.max(1, Number(inp && inp.value) || batch);
        var lines = [r.title + ' — ' + b + 'غ', ''];
        (r.phases||[]).forEach(function(ph){ lines.push(ph.name + (ph.temp?' ('+ph.temp+')':'')); (ph.items||[]).forEach(function(it){ lines.push('- '+it.name+' ('+(it.inci||'')+'): '+fmt(Math.round((Number(it.pct)||0)*b)/100)+' غ ('+it.pct+'%)'); }); lines.push(''); });
        var txt = lines.join('\n');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function(){ toast('تم نسخ الصيغة'); }); else { toast('لم يتم النسخ تلقائياً'); }
      });
    }
    return { html: html, after: after };
  };

  /* ---------- Lab ---------- */
  P.lab = function () {
    var html = crumbs([{label:"الرئيسية", href:"#/home"}, {label:"مختبر الصياغة"}]) +
      pageHead("مختبر الصياغة", "حاسبات <span class='accent'>عملية</span>", "أدوات سريعة لتحويل النسب إلى غرامات، وفهم مزج المستحلبات، وتقدير التصبّن. النتائج إرشادية وتحتاج تحققاً مخبرياً.") +
      '<div class="panel"><h2>' + ic("flask") + ' حاسبة النسبة إلى غرام</h2>' +
      '<div class="form-grid"><label class="field"><span>حجم الدفعة (غ)</span><input id="labBatch" class="input" type="number" value="100" min="1"></label>' +
      '<label class="field"><span>النسبة (%)</span><input id="labPct" class="input" type="number" value="5" min="0" step="0.1"></label></div>' +
      '<div class="result-box" style="margin-top:12px"><div class="result-big" id="labRes">5.00 غ</div><div class="tiny muted">الكمية = الدفعة × النسبة ÷ 100</div></div></div>' +
      '<div class="panel" style="margin-top:16px"><h2>' + ic("layers") + ' حاسبة HLB مبسطة</h2><p class="small muted">اختر زيتاً ومستحلبين لتقدير المزج (تقريبي).</p>' +
      '<div class="form-grid"><label class="field"><span>HLB المطلوب (تقريبي)</span><input id="hlbNeed" class="input" type="number" value="10" step="0.1"></label>' +
      '<label class="field"><span>HLB مستحلب مرتفع</span><input id="hlbHi" class="input" type="number" value="15" step="0.1"></label>' +
      '<label class="field"><span>HLB مستحلب منخفض</span><input id="hlbLo" class="input" type="number" value="4.3" step="0.1"></label></div>' +
      '<div class="result-box" style="margin-top:12px"><div class="result-big" id="hlbRes">—</div><div class="tiny muted" id="hlbNote">أدخل القيم للحساب</div></div></div>' +
      '<div class="panel" style="margin-top:16px"><h2>' + ic("bubbles") + ' تقدير تصبّن سريع (تقريبي)</h2>' +
      '<div class="callout callout-warn">' + ic("alert") + '<div><strong>تنبيه سلامة</strong><p>التصبّن يستخدم مواد كاوية. هذا تقدير تعليمي فقط — استخدم حاسبة SAP دقيقة لكل زيت وارتدِ واقيات كاملة.</p></div></div>' +
      '<div class="form-grid"><label class="field"><span>وزن الزيوت (غ)</span><input id="sapOil" class="input" type="number" value="500" min="1"></label>' +
      '<label class="field"><span>عامل SAP تقريبي (NaOH)</span><input id="sapF" class="input" type="number" value="0.136" step="0.001"></label>' +
      '<label class="field"><span>خصم فائض % (superfat)</span><input id="sapSf" class="input" type="number" value="5" step="0.5"></label></div>' +
      '<div class="result-box" style="margin-top:12px"><div class="result-big" id="sapRes">—</div><div class="tiny muted">NaOH تقريبي = زيوت × SAP × (1 − خصم). راجع قيم SAP لكل زيت.</div></div></div>';
    function after() {
      function calcLab() { var b=Number(qs('#labBatch').value)||0, p=Number(qs('#labPct').value)||0; qs('#labRes').textContent = fmt(Math.round(b*p)/100) + ' غ'; }
      ['labBatch','labPct'].forEach(function(id){ var el=qs('#'+id); if(el) el.addEventListener('input', calcLab); }); calcLab();
      function calcHlb() {
        var need=Number(qs('#hlbNeed').value), hi=Number(qs('#hlbHi').value), lo=Number(qs('#hlbLo').value);
        if (hi===lo || isNaN(need)) { qs('#hlbRes').textContent='—'; return; }
        var pHi = (need-lo)/(hi-lo)*100; var pLo = 100-pHi;
        if (pHi<0||pHi>100) { qs('#hlbRes').textContent='خارج المجال'; qs('#hlbNote').textContent='القيم المدخلة لا تعطي مزجاً بين المستحلبين.'; }
        else { qs('#hlbRes').textContent = fmt(Math.round(pHi*10)/10)+'% مرتفع / '+fmt(Math.round(pLo*10)/10)+'% منخفض'; qs('#hlbNote').textContent='نسبة تقريبية من إجمالي المستحلب.'; }
      }
      ['hlbNeed','hlbHi','hlbLo'].forEach(function(id){ var el=qs('#'+id); if(el) el.addEventListener('input', calcHlb); }); calcHlb();
      function calcSap() { var oil=Number(qs('#sapOil').value)||0, f=Number(qs('#sapF').value)||0, sf=Number(qs('#sapSf').value)||0; var naoh=oil*f*(1-sf/100); qs('#sapRes').textContent = fmt(Math.round(naoh*100)/100)+' غ NaOH (تقريبي)'; }
      ['sapOil','sapF','sapSf'].forEach(function(id){ var el=qs('#'+id); if(el) el.addEventListener('input', calcSap); }); calcSap();
    }
    return { html: html, after: after };
  };

  /* ---------- Quality ---------- */
  var GMP = [
    ['g1','نظافة اليدين وارتداء القفازات/المئزر عند الحاجة'],
    ['g2','تعقيم الأدوات والأسطح قبل التصنيع'],
    ['g3','استخدام ماء مقطر/منزوع الأيونات للطور المائي'],
    ['g4','توثيق أوزان المواد والدفعة (Batch record)'],
    ['g5','التحقق من تواريخ الصلاحية وحالة المواد الخام'],
    ['g6','قياس وتسجيل pH والحرارة عند النقاط الحرجة'],
    ['g7','إضافة الحافظ وفق النسبة المعتمدة وتوافقه مع pH'],
    ['g8','تعبئة في عبوات نظيفة ومناسبة مع بطاقة تعريف'],
    ['g9','حفظ عينات مرجعية من الدفعة'],
    ['g10','خطة تنظيف وتعقيم بعد الانتهاء']
  ];
  P.quality = function () {
    var done = GMP.filter(function(x){ return S.checklist && S.checklist[x[0]]; }).length;
    var pct = Math.round(done / GMP.length * 100);
    var html = crumbs([{label:"الرئيسية", href:"#/home"}, {label:"الجودة والسلامة"}]) +
      pageHead("الجودة والسلامة", "ممارسات تصنيع جيدة <span class='accent'>GMP</span>", "قائمة تحقق عملية، واختبارات أساسية قبل الإطلاق. الهدف تقليل مخاطر التلوث وعدم الاستقرار.") +
      '<div class="grid-2"><div class="panel"><h2>' + ic("shield") + ' قائمة تحقق المختبر</h2><p class="small muted">علّم ما يتحقق فعلياً في ورشتك. تُحفظ الحالة على جهازك.</p>' +
      '<div class="check-progress"><div class="progress-line"><i id="gmpBar" style="width:' + pct + '%"></i></div><strong class="small num" id="gmpCount">' + fmt(done) + '/' + fmt(GMP.length) + '</strong></div>' +
      '<div class="check-grid">' + GMP.map(function(x){ return '<label class="check-item ' + (S.checklist && S.checklist[x[0]] ? 'is-checked' : '') + '"><input type="checkbox" data-check="' + x[0] + '" ' + (S.checklist && S.checklist[x[0]] ? 'checked' : '') + '><span>' + esc(x[1]) + '</span></label>'; }).join("") + '</div></div>' +
      '<div><div class="panel"><h2>' + ic("target") + ' اختبارات أساسية</h2><ul class="bullet-list"><li><strong>pH:</strong> توافق مع البشرة ومع فعالية الحافظ.</li><li><strong>المظهر/الرائحة:</strong> أي تغير غير طبيعي إشارة لمشكلة.</li><li><strong>اللزوجة:</strong> مقارنة بمعيار الدفعة المرجعية.</li><li><strong>استقرار أولي:</strong> حرارة/برودة ودورات بسيطة قبل الإطلاق.</li><li><strong>توافق العبوة:</strong> لا تسرب، لا تفاعل، سهولة استخدام.</li></ul></div>' +
      '<div class="panel" style="margin-top:14px"><h2>' + ic("alert") + ' تنبيه مهني</h2><p class="small">المحتوى تعليمي. الالتزام التنظيمي يعتمد على بلدك ونوع المنتج والادعاءات. تحقق دائماً من المتطلبات المحلية واستشر مختصاً عند الحاجة.</p></div></div></div>';
    function after() {
      qsa('[data-check]').forEach(function(ch){ ch.addEventListener('change', function(){
        if (!S.checklist) S.checklist = {};
        S.checklist[ch.getAttribute('data-check')] = ch.checked;
        store.set('checklist', S.checklist);
        ch.closest('.check-item').classList.toggle('is-checked', ch.checked);
        var d = GMP.filter(function(x){ return S.checklist[x[0]]; }).length;
        var bar=qs('#gmpBar'), cnt=qs('#gmpCount'); if(bar) bar.style.width = Math.round(d/GMP.length*100)+'%'; if(cnt) cnt.textContent = fmt(d)+'/'+fmt(GMP.length);
      }); });
    }
    return { html: html, after: after };
  };

  /* ---------- Glossary ---------- */
  P.glossary = function (params, query) {
    var q0 = (query && query.get('q')) || '';
    var html = crumbs([{label:"الرئيسية", href:"#/home"}, {label:"المعجم"}]) +
      pageHead("المعجم", "مصطلحات <span class='accent'>التجميل والتصنيع</span>", "تعريفات سريعة للمصطلحات التي ستقابلها في المواد والوصفات وطرق التصنيع.") +
      '<div class="toolbar"><div class="search-input-wrap">' + ic("search") + '<input class="input" id="glSearch" type="search" placeholder="ابحث في المصطلحات…" value="' + esc(q0) + '"></div><div class="result-count" id="glCount"></div></div>' +
      '<div class="gloss-list" id="glList"></div>';
    function apply() {
      var q = qs('#glSearch') ? qs('#glSearch').value : '';
      var n = normText(q);
      var arr = D.glossary.filter(function(g){ if(!n) return true; var hay=normText([g.ar,g.fr,g.en,g.def,g.cat].join(' ')); return n.split(/\s+/).every(function(w){ return hay.indexOf(w)>=0; }); });
      arr.sort(function(a,b){ return String(a.ar||'').localeCompare(String(b.ar||''),'ar'); });
      var box = qs('#glList');
      if (box) box.innerHTML = arr.length ? arr.map(function(g){ return '<div class="gloss-item"><div class="gloss-head"><strong>'+esc(g.ar)+'</strong><span class="fr">'+esc(g.fr||'')+'</span><span class="en">'+esc(g.en||'')+'</span></div><p>'+inline(g.def||'')+'</p><span class="tag">'+esc(g.cat||'عام')+'</span></div>'; }).join('') : '<div class="empty-state"><div class="es-ico">'+ic("search")+'</div><h2>لا توجد نتائج</h2></div>';
      var cnt=qs('#glCount'); if(cnt) cnt.textContent = fmt(arr.length)+' مصطلح';
    }
    return { html: html, after: function(){ apply(); var inp=qs('#glSearch'); if(inp) inp.addEventListener('input', apply); } };
  };

  /* ---------- Methods ---------- */
  P.methods = function () {
    return crumbs([{label:"الرئيسية", href:"#/home"}, {label:"طرق التصنيع"}]) +
      pageHead("طرق التصنيع", "إجراءات <span class='accent'>خطوة بخطوة</span>", "طرق عملية مع المعدات ونقاط التحكم الحرجة (CCP) والأخطاء الشائعة.", '<span class="tag tag-rose" style="padding:6px 12px">' + fmt(D.methods.length) + ' طريقة</span>') +
      '<div class="grid-2">' + D.methods.map(function(m){
        return '<a class="method-card" href="#/method/' + m.id + '"><span class="method-ico">' + ic(m.icon||"flame") + '</span><div><h3>' + esc(m.title) + '</h3><div class="fr">' + esc(m.fr||"") + '</div><p>' + inline(m.desc||"") + '</p><div class="mm"><span>' + ic("clock") + ' ' + esc(m.time||"") + '</span><span>' + ic("target") + ' مستوى ' + fmt(m.level||1) + '</span></div></div></a>';
      }).join("") + '</div>';
  };

  P.method = function (params) {
    var m = byId(D.methods, params.id);
    if (!m) return notFound("الطريقة");
    return crumbs([{label:"الرئيسية", href:"#/home"}, {label:"طرق التصنيع", href:"#/methods"}, {label:m.title}]) +
      '<section class="detail-hero" style="--accent:#c17f62"><div class="detail-hero-top"><div><span class="eyebrow">' + esc(t("مستوى") + ' ' + fmt(m.level||1) + ' · ' + typeLabel(m.type)) + '</span><h1>' + esc(m.title) + '</h1><div class="fr">' + esc(m.fr||"") + '</div></div><div class="detail-actions">' + ic(m.icon||"flame") + '</div></div><p class="lead">' + inline(m.desc||"") + '</p>' +
      '<div class="meta-grid"><div class="meta-item"><span>المدة</span><strong>' + esc(m.time||"—") + '</strong></div><div class="meta-item"><span>المستوى</span><strong>' + fmt(m.level||1) + ' / 4</strong></div><div class="meta-item"><span>الخطوات</span><strong>' + fmt((m.steps||[]).length) + '</strong></div></div></section>' +
      '<div class="detail-grid"><div>' +
      '<div class="panel"><h2>' + ic("layers") + ' المعدات</h2><div class="chips">' + (m.equipment||[]).map(function(e){ return '<span class="chip chip-soft">'+esc(e)+'</span>'; }).join("") + '</div></div>' +
      '<div class="panel" style="margin-top:16px"><h2>' + ic("list") + ' الخطوات</h2><div class="step-list">' + (m.steps||[]).map(function(s,i){ return '<div class="step-item"><span class="step-dot">' + fmt(i+1) + '</span><div class="step-copy"><strong>' + esc(s.t||'') + '</strong><p>' + inline(s.d||'') + '</p>' + (s.ccp?'<div class="callout callout-gold" style="margin-top:7px;padding:8px 11px">' + ic("target") + '<div><strong>نقطة تحكم حرجة</strong><p>' + inline(s.ccp) + '</p></div></div>':'') + '</div></div>'; }).join("") + '</div></div>' +
      ((m.defects&&m.defects.length)?'<div class="panel" style="margin-top:16px"><h2>' + ic("alert") + ' أعطال شائعة</h2><div class="table-wrap"><table class="table"><thead><tr><th>العطل</th><th>السبب والحل</th></tr></thead><tbody>' + m.defects.map(function(d){ return '<tr><td><strong>'+esc(d.p)+'</strong></td><td>'+inline(d.c)+'</td></tr>'; }).join("") + '</tbody></table></div></div>':'') +
      '</div><aside class="sticky-side">' + ((m.tips&&m.tips.length)?'<div class="panel"><h2>' + ic("sparkle") + ' نصائح</h2><ul class="bullet-list">' + m.tips.map(function(t){ return '<li>'+inline(t)+'</li>'; }).join("") + '</ul></div>':'') + '</aside></div>';
  };

  /* ---------- Quizzes ---------- */
  P.quizzes = function () {
    var mods = D.modules || [];
    return crumbs([{label:"الرئيسية", href:"#/home"}, {label:"الاختبارات"}]) +
      pageHead("الاختبارات", "تحقق من <span class='accent'>فهمك</span>", "اختبار لكل مسار (70% للنجاح) وامتحان نهائي شامل. يمكنك إعادة الاختبار لتحسين نتيجتك.") +
      '<h2 class="sr-only">قائمة الاختبارات</h2>' +
      '<div class="card-grid">' + mods.map(function(m){
        var q = byId(D.quizzes, m.quiz);
        var sc = S.quizzes && S.quizzes[m.quiz];
        var p = sc && sc.total ? Math.round(sc.best/sc.total*100) : null;
        return '<a class="panel" href="#/quiz/' + (m.quiz||'') + '" style="display:block;color:inherit"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><h3 style="margin:0 0 4px">' + esc(q?q.title:('اختبار '+m.title)) + '</h3><div class="small muted">' + esc(m.title) + ' · ' + fmt(q && q.questions ? q.questions.length : 0) + ' سؤال</div></div>' + (p!==null?'<span class="tag ' + (p>=70?'tag-green':'tag-rose') + '">' + p + '%</span>':'<span class="tag">ابدأ</span>') + '</div></a>';
      }).join("") +
      '<a class="panel" href="#/quiz/final" style="display:block;color:inherit;border-color:var(--primary)"><div style="display:flex;justify-content:space-between;align-items:center"><div><h3 style="margin:0 0 4px">الامتحان النهائي الشامل</h3><div class="small muted">يغطي كل المسارات</div></div><span class="tag tag-gold">نهائي</span></div></a></div>';
  };

  function getQuiz(id) {
    if (id === 'final') {
      var all = [];
      (D.quizzes||[]).forEach(function(q){ (q.questions||[]).forEach(function(qq){ all.push({q:qq.q, opts:qq.opts, a:qq.a, ex:qq.ex, _src:q.title}); }); });
      // pick up to 20
      var pick = all.slice(0, 20);
      return { id:'final', title:'الامتحان النهائي الشامل', desc:'أسئلة من جميع المسارات.', questions: pick };
    }
    return byId(D.quizzes, id);
  }

  P.quiz = function (params) {
    var quiz = getQuiz(params.id);
    if (!quiz || !quiz.questions || !quiz.questions.length) return notFound("الاختبار");
    var prev = S.quizzes && S.quizzes[quiz.id];
    var html = crumbs([{label:"الرئيسية", href:"#/home"}, {label:"الاختبارات", href:"#/quizzes"}, {label:quiz.title}]) +
      pageHead(quiz.title, quiz.title, quiz.desc || '', (prev ? '<span class="tag ' + (Math.round(prev.best/prev.total*100)>=70?'tag-green':'tag-rose') + '">' + t('أفضل نتيجة') + ': ' + Math.round(prev.best/prev.total*100) + '%</span>' : '')) +
      '<h2 class="sr-only">الأسئلة</h2>' +
      '<div class="quiz-wrap" id="quizWrap"></div>';
    function after() {
      var idx = 0, answers = [], qsArr = quiz.questions, done = false;
      var wrap = qs('#quizWrap');
      function renderQ() {
        if (idx >= qsArr.length) { return finish(); }
        var it = qsArr[idx];
        wrap.innerHTML = '<div class="panel"><div class="small muted" style="margin-bottom:8px">' + tf('سؤال {n} / {total}', { n: fmt(idx+1), total: fmt(qsArr.length) }) + '</div>' +
          '<div class="progress-line" style="margin-bottom:14px"><i style="width:' + Math.round(idx/qsArr.length*100) + '%"></i></div>' +
          '<h3 style="margin:0 0 14px">' + esc(it.q) + '</h3>' +
          '<div class="quiz-opts">' + (it.opts||[]).map(function(o,i){ return '<button class="quiz-opt" data-opt="' + i + '"><span class="opt-letter">' + String.fromCharCode(65+i) + '</span><span>' + esc(o) + '</span></button>'; }).join("") + '</div></div>';
        qsa('[data-opt]', wrap).forEach(function(btn){ btn.addEventListener('click', function(){
          if (done) return;
          var chosen = Number(btn.getAttribute('data-opt'));
          answers[idx] = chosen;
          var correct = chosen === it.a;
          qsa('[data-opt]', wrap).forEach(function(b){ var bi=Number(b.getAttribute('data-opt')); b.disabled=true; if(bi===it.a) b.classList.add('is-correct'); if(bi===chosen && !correct) b.classList.add('is-wrong'); });
          var ex = document.createElement('div'); ex.className = 'callout ' + (correct?'callout-tip':'callout-warn'); ex.style.marginTop='12px'; ex.innerHTML = ic(correct?'check':'info') + '<div><strong>' + (correct?'إجابة صحيحة':'إجابة غير دقيقة') + '</strong><p>' + esc(it.ex||'') + '</p></div>';
          wrap.querySelector('.panel').appendChild(ex);
          var next = document.createElement('button'); next.className='btn btn-primary'; next.style.marginTop='12px'; next.textContent = (idx < qsArr.length-1) ? 'السؤال التالي' : 'عرض النتيجة';
          next.addEventListener('click', function(){ idx++; renderQ(); });
          wrap.querySelector('.panel').appendChild(next);
        }); });
      }
      function finish() {
        done = true;
        var score = 0; qsArr.forEach(function(it,i){ if (answers[i]===it.a) score++; });
        if (!S.quizzes) S.quizzes = {};
        var prev2 = S.quizzes[quiz.id] || {best:0, total:qsArr.length, attempts:0};
        prev2.best = Math.max(prev2.best, score); prev2.total = qsArr.length; prev2.attempts = (prev2.attempts||0)+1; prev2.last = score;
        S.quizzes[quiz.id] = prev2; saveQuiz(); store.set('quizzes', S.quizzes);
        var p = Math.round(score/qsArr.length*100); var pass = p >= 70;
        wrap.innerHTML = '<div class="panel" style="text-align:center"><div class="result-big" style="font-size:2.2rem">' + p + '%</div><h2 style="margin:8px 0">' + (pass?'أحسنت! اجتزت الاختبار':'تحتاج مراجعة إضافية') + '</h2>' +
          '<p class="muted">' + tf('أجبت بشكل صحيح على {n} من {total}. {hint}', { n: fmt(score), total: fmt(qsArr.length), hint: (pass ? t('يمكنك متابعة المسار التالي.') : t('راجع الدروس ثم أعد المحاولة (النجاح 70%).')) }) + '</p>' +
          '<div class="btn-row" style="justify-content:center;margin-top:14px"><button class="btn btn-primary" id="retryQuiz">' + ic('play') + ' إعادة الاختبار</button><a class="btn btn-ghost" href="#/quizzes">كل الاختبارات</a></div></div>';
        var rb=qs('#retryQuiz'); if(rb) rb.addEventListener('click', function(){ idx=0; answers=[]; done=false; renderQ(); });
      }
      renderQ();
    }
    return { html: html, after: after };
  };

  /* ---------- Certificate ---------- */
  P.certificate = function () {
    var eligible = isEligible();
    var name = (S.name || '').trim() || t('متدرّب/ـة COSMADEDZ');
    var date = C.I18N ? C.I18N.formatDate(new Date()) : new Date().toLocaleDateString('ar-DZ');
    if (!eligible) {
      return crumbs([{label:'الرئيسية', href:'#/home'}, {label:'الشهادة'}]) +
        pageHead('الشهادة', 'شهادة <span class="accent">الإتمام</span>', 'تُفتح الشهادة بعد إكمال الدروس واجتياز 4 اختبارات على الأقل بنسبة 70%.') +
        '<div class="panel"><h2>' + ic('lock') + ' الشهادة غير متاحة بعد</h2><ul class="bullet-list"><li>الدروس المكتملة: ' + fmt(doneLessons()) + ' / ' + fmt(totalLessons()) + '</li><li>اختبارات مجتازة (≥70%): ' + fmt(passedQuizCount()) + ' / 4</li></ul><div class="btn-row" style="margin-top:12px"><a class="btn btn-primary" href="#/learn">أكمل التعلّم</a><a class="btn btn-ghost" href="#/quizzes">الاختبارات</a></div></div>';
    }
    var html = '<div class="no-print">' + crumbs([{label:'الرئيسية', href:'#/home'}, {label:'الشهادة'}]) + '</div>' +
      '<div class="cert-wrap" id="certWrap"><div class="cert"><div class="cert-brand">COSMADEDZ</div><div class="cert-sub">شهادة إتمام تكوين</div><h1>صناعة مواد التجميل والعناية بالجسم</h1>' +
      '<p class="cert-lead">تشهد منصة COSMADEDZ بأن</p><div class="cert-name">' + esc(name) + '</div>' +
      '<p class="cert-lead">قد أتم/أتمّت مسار التكوين وأظهر/أظهرت فهماً للأساسيات، المواد الأولية، طرق التصنيع، الجودة والسلامة.</p>' +
      '<div class="cert-meta"><div><span>التاريخ</span><strong>' + esc(date) + '</strong></div><div><span>التقدم</span><strong>' + overallPct() + '%</strong></div><div><span>اختبارات مجتازة</span><strong>' + fmt(passedQuizCount()) + '</strong></div></div></div>' +
      '<div class="cert-actions no-print"><a class="btn btn-ghost" href="#/profile">' + ic('edit') + ' تعديل الاسم</a><button class="btn btn-primary" id="printCert">' + ic('printer') + ' طباعة الشهادة</button></div></div>';
    return { html: html, after: function(){ var b=qs('#printCert'); if(b) b.addEventListener('click', function(){ document.body.classList.add('printing-cert'); window.print(); setTimeout(function(){ document.body.classList.remove('printing-cert'); }, 500); }); } };
  };

  /* ---------- Profile ---------- */
  P.profile = function () {
    var session = C.getSession ? C.getSession() : null;
    var authed = C.isAuthed ? C.isAuthed() : false;
    var admin = C.isAdmin ? C.isAdmin() : false;
    var stats = [
      {l:'الدروس', v: fmt(doneLessons())+'/'+fmt(totalLessons())},
      {l:'التقدم', v: overallPct()+'%'},
      {l:'اختبارات مجتازة', v: fmt(passedQuizCount())},
      {l:'المفضلة', v: fmt(S.favs ? S.favs.size : 0)}
    ];
    var html = crumbs([{label:'الرئيسية', href:'#/home'}, {label:'حسابي'}]) +
      pageHead('حسابي', 'تقدّمك <span class="accent">وحساب الوصول</span>', 'التقدم محفوظ محلياً على هذا الجهاز. حسابك محمي بكود تفعيل يصدره مسؤول المنصة.') +
      '<div class="grid-2"><div class="panel"><h2>' + ic('user') + ' الملف الشخصي</h2>' +
      '<label class="field"><span>الاسم (يظهر على الشهادة)</span><input id="profName" class="input" value="' + esc(S.name || (session && session.name) || '') + '" placeholder="اكتب اسمك"></label>' +
      '<button class="btn btn-primary" style="margin-top:10px" id="saveName">حفظ</button>' +
      '<div class="result-list" style="margin-top:14px"><div><span>البريد</span><b dir="ltr">' + esc(session && session.email ? session.email : '—') + '</b></div><div><span>الهاتف</span><b dir="ltr">' + esc(session && session.phone ? session.phone : '—') + '</b></div><div><span>الدور</span><b>' + (admin ? 'مسؤول (Admin)' : (authed ? 'مستخدم مفعّل' : 'غير مفعّل')) + '</b></div></div>' +
      (admin ? '<a class="btn btn-soft btn-block" style="margin-top:12px" href="#/admin">' + ic('shield') + ' لوحة تحكم المسؤول</a>' : '') +
      (authed ? '<button class="btn btn-ghost btn-block" style="margin-top:8px;color:var(--danger)" id="logoutBtn">' + ic('close') + ' تسجيل الخروج</button>' : '<a class="btn btn-primary btn-block" style="margin-top:12px" href="#/login">تسجيل الدخول</a>') +
      '</div>' +
      '<div class="panel"><h2>' + ic('target') + ' الإحصاءات</h2><div class="result-list">' + stats.map(function(s){ return '<div><span>'+s.l+'</span><b>'+s.v+'</b></div>'; }).join("") + '</div></div></div>' +
      '<div class="panel no-print" style="margin-top:16px"><h2>' + ic('download') + ' البيانات</h2><p class="small muted">تصدير أو مسح التقدم المحفوظ على هذا المتصفح. مسح التقدم لا يحذف جلسة الدخول.</p><div class="btn-row" style="margin-top:10px"><button class="btn btn-soft" id="exportData">' + ic('download') + ' تصدير JSON</button><button class="btn btn-ghost" id="resetData" style="color:var(--danger)">' + ic('trash') + ' مسح التقدم</button></div></div>';
    return { html: html, after: function(){
      var sn=qs('#saveName'); if(sn) sn.addEventListener('click', function(){ S.name = (qs('#profName').value||'').trim(); store.set('name', S.name); toast('تم حفظ الاسم'); });
      var lo=qs('#logoutBtn'); if(lo) lo.addEventListener('click', function(){ if(!confirm(t('تسجيل الخروج من هذا الجهاز؟'))) return; var done = C.logoutSession ? C.logoutSession() : Promise.resolve(); if (!C.logoutSession && C.clearSession) C.clearSession(); done.then(function(){ toast(t('تم تسجيل الخروج')); C.go('#/login'); }); });
      var ex=qs('#exportData'); if(ex) ex.addEventListener('click', function(){ var data={name:S.name,lessons:Array.from(S.lessons||[]),quizzes:S.quizzes,favs:Array.from(S.favs||[]),checklist:S.checklist,notes:S.notes,ts:new Date().toISOString()}; var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='cosmadedz-progress.json'; a.click(); toast('تم التصدير'); });
      var rs=qs('#resetData'); if(rs) rs.addEventListener('click', function(){ if(!confirm(t('مسح كل التقدم المحفوظ على هذا الجهاز؟'))) return; try{ Object.keys(localStorage).forEach(function(k){ if(k.indexOf('cosd_v1_')===0 && k.indexOf('session')<0) localStorage.removeItem(k); }); }catch(e){} toast('تم مسح التقدم'); setTimeout(function(){ location.reload(); }, 600); });
    }};
  };

  /* ---------- Login / Activation (server-backed) ---------- */
  P.login = function () {
    var staticMode = C.isStatic && C.isStatic();
    if (staticMode) {
      return { html: crumbs([{label:'COSMADEDZ', href:'#/login'}]) +
        pageHead('الدخول', '<span class="accent">وضع العرض الثابت</span>', '') +
        '<div class="callout callout-info" style="margin-bottom:14px">' + ic('info') + '<div><strong>' + t('نسخة عرض ثابتة') + '</strong><p>' + t('هذه نسخة منشورة على استضافة ثابتة (GitHub Pages). تسجيل الدخول والتفعيل بالكود يعملان فقط عند تشغيل خادم COSMADEDZ. يمكنك متابعة كل الدروس والوصفات والاختبارات والشهادة بدون حساب.') + '</p></div></div>' +
        '<div class="panel" style="text-align:center"><h2>' + ic('check') + ' ' + t('الدراسة متاحة الآن') + '</h2><p class="small muted">' + t('تقدّمك يُحفظ محلياً على هذا الجهاز.') + '</p><div class="btn-row" style="justify-content:center;margin-top:14px"><a class="btn btn-primary" href="#/home">' + t('ابدأ الدراسة') + '</a><a class="btn btn-ghost" href="#/about">' + t('عن التطبيق') + '</a></div></div>',
        after: function(){} };
    }
    var html = crumbs([{label:'COSMADEDZ', href:'#/login'}]) +
      pageHead('الدخول', 'تسجيل الدخول / <span class="accent">طلب تفعيل</span>', 'اطلب الوصول باسمك وبريدك. يراجع المسؤول الطلب ثم يصلك كود تفعيل من 6 أرقام. لا يمكن الدخول قبل التفعيل.') +
      '<div class="callout callout-info" id="srvStatus" style="margin-bottom:14px">' + ic('info') + '<div><strong>حالة الخادم</strong><p id="srvStatusText">جارٍ التحقق من الاتصال…</p></div></div>' +
      '<div class="grid-2"><div class="panel"><h2>' + ic('user') + ' طلب دخول جديد</h2>' +
      '<label class="field"><span>الاسم الكامل</span><input id="lgName" class="input" autocomplete="name" placeholder="الاسم واللقب"></label>' +
      '<label class="field"><span>الهاتف</span><input id="lgPhone" class="input" autocomplete="tel" placeholder="05xxxxxxxx" dir="ltr" inputmode="tel"></label>' +
      '<label class="field"><span>البريد الإلكتروني</span><input id="lgEmail" class="input" type="email" autocomplete="email" placeholder="name@example.com" dir="ltr"></label>' +
      '<div class="btn-row" style="margin-top:12px"><button class="btn btn-primary" id="lgSubmit">' + ic('check') + ' إرسال الطلب</button></div>' +
      '<div id="lgMsg" style="margin-top:12px"></div></div>' +
      '<div class="panel"><h2>' + ic('key') + ' تفعيل الحساب</h2><p class="small muted">بعد موافقة المسؤول، أدخل بريدك والكود المكوّن من 6 أرقام.</p>' +
      '<label class="field"><span>البريد الإلكتروني</span><input id="acEmail" class="input" type="email" dir="ltr" placeholder="name@example.com"></label>' +
      '<label class="field"><span>كود التفعيل</span><input id="acCode" class="input" dir="ltr" placeholder="123456" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></label>' +
      '<div class="btn-row" style="margin-top:10px"><button class="btn btn-soft" id="acSubmit">' + ic('key') + ' تفعيل الدخول</button><button class="btn btn-ghost" id="acResend">إعادة إرسال الكود</button></div>' +
      '<div id="acMsg" style="margin-top:12px"></div>' +
      '<div class="callout callout-tip" style="margin-top:14px">' + ic('check') + '<div><strong>حساب مفعّل مسبقاً؟</strong><p>اطلب كوداً جديداً من المسؤول ثم أكمل التفعيل من هنا.</p></div></div></div></div>';
    return { html: html, after: function(){
      var A = C.AUTH;
      function show(el, htmlMsg, kind){ var e=qs(el); if(!e) return; e.innerHTML = '<div class="callout ' + (kind||'callout-info') + '">' + ic(kind==='callout-warn'?'alert':kind==='callout-tip'?'check':'info') + '<div><p>' + htmlMsg + '</p></div></div>'; }
      function fail(el, err){
        var msg = C.I18N ? C.I18N.apiError(err) : ((err && err.message) || 'تعذر إكمال الطلب.');
        show(el, esc(msg), 'callout-warn');
      }

      if (A) {
        A.health().then(function(h){
          var tEl = qs('#srvStatusText');
          if (tEl) tEl.innerHTML = t('متصل —') + ' ' + (h.smtp ? t('إرسال البريد مهيأ.') : t('البريد غير مهيأ: سيُسلّم كود التفعيل عبر المسؤول.'));
        }).catch(function(){
          var box = qs('#srvStatus'); if (box) box.className = 'callout callout-warn';
          var tEl = qs('#srvStatusText');
          if (tEl) tEl.innerHTML = t('تعذر الاتصال بالخادم. شغّل') + ' <b dir="ltr">python server/server.py</b> ' + t('ثم أعد المحاولة.');
        });
      } else {
        var box0 = qs('#srvStatus'); if (box0) box0.className = 'callout callout-warn';
        var t0 = qs('#srvStatusText'); if (t0) t0.textContent = 'واجهة الخادم غير محمّلة. تحقق من الملف js/auth-api.js.';
      }

      var sub=qs('#lgSubmit'); if(sub) sub.addEventListener('click', function(){
        var name=(qs('#lgName').value||'').trim(), phone=(qs('#lgPhone').value||'').trim(), email=C.normEmail(qs('#lgEmail').value||'');
        if(!name || !phone || !email || email.indexOf('@')<0){ show('#lgMsg','يرجى إدخال الاسم الكامل والهاتف وبريد إلكتروني صحيح.','callout-warn'); return; }
        if(!A){ show('#lgMsg','واجهة الخادم غير محمّلة. تأكد من تشغيل الخادم وتحديث الصفحة.','callout-warn'); return; }
        sub.disabled = true;
        A.requestAccess({name:name, phone:phone, email:email}).then(function(r){
          show('#lgMsg', esc(r.message || 'تم استلام طلبك.'), 'callout-info');
          var ae = qs('#acEmail'); if (ae && !ae.value) ae.value = email;
        }).catch(function(err){ fail('#lgMsg', err); }).then(function(){ sub.disabled = false; });
      });

      var ac=qs('#acSubmit'); if(ac) ac.addEventListener('click', function(){
        var email=C.normEmail(qs('#acEmail').value||''), code=String(qs('#acCode').value||'').replace(/\s+/g,'');
        if(!email || !/^\d{6}$/.test(code)){ show('#acMsg','أدخل البريد وكود التفعيل (6 أرقام).','callout-warn'); return; }
        if(!A){ show('#acMsg','واجهة الخادم غير محمّلة.','callout-warn'); return; }
        ac.disabled = true;
        A.activate({email:email, code:code}).then(function(r){
          C.setSession({token:r.token, email:r.user.email, name:r.user.name, phone:r.user.phone, role:r.user.role, activated:true, activatedAt:Date.now()});
          if(!S.name){ S.name = r.user.name || ''; store.set('name', S.name); }
          toast('تم تفعيل الدخول بنجاح');
          C.go(r.user.role === 'admin' ? '#/admin' : '#/home');
        }).catch(function(err){ fail('#acMsg', err); }).then(function(){ ac.disabled = false; });
      });

      var rs=qs('#acResend'); if(rs) rs.addEventListener('click', function(){
        var email=C.normEmail(qs('#acEmail').value||'');
        if(!email){ show('#acMsg','أدخل البريد الإلكتروني أولاً.','callout-warn'); return; }
        if(!A){ show('#acMsg','واجهة الخادم غير محمّلة.','callout-warn'); return; }
        rs.disabled = true;
        A.resend(email).then(function(r){ show('#acMsg', esc(r.message || 'تم إرسال كود جديد.'), 'callout-tip'); })
          .catch(function(err){
            if (err && err.code === 'smtp_not_configured') show('#acMsg','البريد غير مهيأ على الخادم. تواصل مع المسؤول ليصدر لك الكود ويسلّمه لك.','callout-warn');
            else fail('#acMsg', err);
          }).then(function(){ rs.disabled = false; });
      });
    }};
  };

  /* ---------- Admin panel (server-backed) ---------- */
  P.admin = function () {
    if (!C.isAdmin || !C.isAdmin()) {
      if (C.isAuthed && C.isAuthed()) {
        return { html: '<div class="empty-state"><div class="es-ico">' + ic('lock') + '</div><h2>غير مصرح</h2><p>هذه اللوحة مخصصة لحساب المسؤول فقط.</p><a class="btn btn-primary" href="#/home">العودة للرئيسية</a></div>' };
      }
      var loginHtml = crumbs([{label:'الرئيسية', href:'#/'}]) +
        pageHead('دخول المسؤول', 'منطقة <span class="accent">محمية</span>', 'أدخل بيانات حساب المسؤول للوصول إلى لوحة الإدارة. لا تُعرض بيانات الدخول داخل التطبيق.') +
        '<div class="panel" style="max-width:520px"><h2>' + ic('shield') + ' دخول آمن</h2>' +
        '<label class="field"><span>البريد الإلكتروني</span><input id="adEmail" class="input" type="email" dir="ltr" autocomplete="username" placeholder="name@example.com" spellcheck="false"></label>' +
        '<label class="field"><span>كلمة المرور</span><input id="adPass" class="input" type="password" dir="ltr" autocomplete="current-password" placeholder="••••••••"></label>' +
        '<div class="btn-row" style="margin-top:12px"><button class="btn btn-primary" id="adSubmit">' + ic('lock') + ' دخول لوحة الإدارة</button></div>' +
        '<div id="adMsg" style="margin-top:12px"></div>' +
        '<div class="callout callout-warn" style="margin-top:14px">' + ic('alert') + '<div><strong>تنبيه أمني</strong><p>تُسجَّل محاولات الدخول الفاشلة وتُحدّ. استخدم كلمة مرور قوية وفريدة، ولا تشاركها مع أي شخص.</p></div></div></div>';
      return { html: loginHtml, after: function(){
        var A = C.AUTH;
        function show(el, msg, kind){
          var e = qs(el); if (!e) return;
          e.innerHTML = '<div class="callout ' + (kind || 'callout-warn') + '">' + ic('alert') + '<div><p>' + msg + '</p></div></div>';
        }
        var btn = qs('#adSubmit'); if (!btn) return;
        function submit(){
          var email = C.normEmail(qs('#adEmail').value || '');
          var password = qs('#adPass').value || '';
          if (!email || !password) { show('#adMsg', 'أدخل البريد الإلكتروني وكلمة المرور.'); return; }
          if (!A) { show('#adMsg', 'واجهة الخادم غير محمّلة.'); return; }
          btn.disabled = true;
          A.adminLogin({ email: email, password: password }).then(function(r){
            C.setSession({ token: r.token, email: r.user.email, name: r.user.name, phone: '', role: 'admin', activated: true, activatedAt: Date.now() });
            toast('مرحباً بك في لوحة الإدارة');
            try { window.dispatchEvent(new Event('hashchange')); } catch (e) { location.reload(); }
          }).catch(function(err){
            show('#adMsg', esc((err && err.message) || 'بيانات الدخول غير صحيحة.'), 'callout-warn');
          }).then(function(){ btn.disabled = false; });
        }
        btn.addEventListener('click', submit);
        var pass = qs('#adPass');
        if (pass) pass.addEventListener('keydown', function(e){ if (e.key === 'Enter') submit(); });
      }};
    }
    var html = crumbs([{label:'الرئيسية', href:'#/home'}, {label:'لوحة الإدارة'}]) +
      pageHead('لوحة الإدارة', 'طلبات الدخول <span class="accent">والتفعيل</span>', 'راجع الطلبات، وافق أو ارفض، وأصدر كود تفعيل من 6 أرقام. الكود صالح 15 دقيقة ويُرسل بالبريد إن كان مهيأً، وإلا يظهر هنا لنسخه وتسليمه.') +
      '<div class="panel"><div class="btn-row" style="justify-content:space-between;align-items:center;flex-wrap:wrap"><h2 style="margin:0">' + ic('list') + ' الطلبات</h2><div class="btn-row"><span class="tag" id="adminSmtp">—</span><button class="btn btn-soft btn-sm" id="adminRefresh">' + ic('refresh') + ' تحديث</button></div></div>' +
      '<div id="adminCounts" class="chips" style="margin:12px 0"></div>' +
      '<div id="adminCodeBox"></div>' +
      '<div id="adminList"><div class="empty-state"><div class="es-ico">' + ic('info') + '</div><h2>جارٍ التحميل…</h2></div></div></div>' +
      '<div class="btn-row" style="margin-top:12px"><button class="btn btn-ghost" id="adminLogout">' + ic('close') + ' تسجيل خروج المسؤول</button><a class="btn btn-soft" href="#/home">العودة للرئيسية</a></div>';
    return { html: html, after: function(){
      var A = C.AUTH;
      var listBox = qs('#adminList'), countsBox = qs('#adminCounts'), smtpChip = qs('#adminSmtp');

      function token(){ var s = C.getSession ? C.getSession() : null; return s && s.token; }
      function guard(err){
        if (err && (err.status === 401 || err.status === 403)) {
          C.clearSession();
          toast('انتهت جلسة المسؤول. يرجى الدخول من جديد.');
          C.go('#/admin');
          return true;
        }
        return false;
      }
      function statusMeta(st){
        if (st === 'active') return {label:t('مفعّل'), cls:'tag-green'};
        if (st === 'approved') return {label:t('مقبول'), cls:'tag-blue'};
        if (st === 'rejected') return {label:t('مرفوض'), cls:'tag-rose'};
        return {label:t('قيد الانتظار'), cls:'tag-gold'};
      }
      function chip(label, value, cls){ return '<span class="tag ' + (cls||'') + '">' + esc(t(label)) + ': <b>' + fmt(value) + '</b></span>'; }

      function showCode(payload){
        var box = qs('#adminCodeBox');
        if (!box) return;
        if (!payload || !payload.code) { box.innerHTML = ''; return; }
        var sent = !!payload.email_sent;
        var note = sent
          ? 'تم إرسال الكود إلى بريد المستخدم. يمكنك نسخه أيضاً.'
          : (payload.smtp
              ? 'تعذر إرسال البريد. انسخ الكود وسلّمه للمستخدم مباشرة.'
              : 'البريد غير مهيأ. انسخ الكود وسلّمه للمستخدم مباشرة.');
        box.innerHTML = '<div class="callout ' + (sent ? 'callout-tip' : 'callout-warn') + '">' + ic(sent ? 'mail' : 'key') + '<div><strong>كود التفعيل: <span dir="ltr" style="font-size:1.35rem;letter-spacing:.12em">' + esc(payload.code) + '</span></strong>' +
          '<p>' + note + '</p>' +
          '<div class="btn-row" style="margin-top:8px"><button class="btn btn-soft btn-sm" id="copyIssuedCode">' + ic('copy') + ' نسخ الكود</button></div></div></div>';
        var cp = qs('#copyIssuedCode');
        if (cp) cp.addEventListener('click', function(){
          var code = payload.code;
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(function(){ toast('تم نسخ الكود'); }).catch(function(){ toast('الكود: ' + code); });
          else toast('الكود: ' + code);
        });
      }

      function renderTable(items){
        if (!items || !items.length) {
          listBox.innerHTML = '<div class="empty-state"><div class="es-ico">' + ic('info') + '</div><h2>لا توجد طلبات</h2><p>ستظهر هنا طلبات الدخول الجديدة.</p></div>';
          return;
        }
        listBox.innerHTML = '<div class="table-wrap"><table class="table"><thead><tr><th>الاسم</th><th>الهاتف</th><th>البريد</th><th>الحالة</th><th>الكود</th><th>إجراء</th></tr></thead><tbody>' +
          items.map(function(r){
            var m = statusMeta(r.status);
            var code = r.code_active ? '<span class="tag tag-green">فعّال</span>' : '—';
            var actions = '';
            if (r.status === 'pending' || r.status === 'rejected') {
              actions += '<button class="btn btn-primary btn-sm" data-approve="' + esc(r.id) + '">' + ic('check') + ' موافقة وإصدار كود</button>';
            } else {
              actions += '<button class="btn btn-soft btn-sm" data-code="' + esc(r.id) + '">' + ic('key') + ' إصدار كود جديد</button>';
            }
            if (r.status !== 'rejected') {
              actions += '<button class="btn btn-ghost btn-sm" data-reject="' + esc(r.id) + '" style="color:var(--danger)">' + ic('close') + ' رفض</button>';
            }
            return '<tr><td>' + esc(r.name || '') + '</td><td dir="ltr">' + esc(r.phone || '') + '</td><td dir="ltr">' + esc(r.email || '') + '</td><td><span class="tag ' + m.cls + '">' + m.label + '</span></td><td>' + code + '</td><td><div class="btn-row" style="gap:6px;flex-wrap:wrap">' + actions + '</div></td></tr>';
          }).join('') + '</tbody></table></div>';
      }

      function bind(){
        qsa('[data-approve]').forEach(function(b){ b.addEventListener('click', function(){ act(b.getAttribute('data-approve'), 'approve'); }); });
        qsa('[data-code]').forEach(function(b){ b.addEventListener('click', function(){ act(b.getAttribute('data-code'), 'code'); }); });
        qsa('[data-reject]').forEach(function(b){ b.addEventListener('click', function(){ act(b.getAttribute('data-reject'), 'reject'); }); });
      }

      function act(id, kind){
        if (!A) { toast('واجهة الخادم غير محمّلة'); return; }
        var confirmMsg = kind === 'reject' ? t('رفض هذا الطلب؟') : kind === 'code' ? t('إصدار كود تفعيل جديد لهذا المستخدم؟') : t('الموافقة على الطلب وإصدار كود تفعيل؟');
        if (!confirm(confirmMsg)) return;
        var fn = kind === 'reject' ? A.reject : kind === 'code' ? A.issueCode : A.approve;
        fn.call(A, token(), id).then(function(payload){
          if (kind === 'reject') { showCode(null); toast('تم رفض الطلب'); }
          else { showCode(payload); toast(payload.email_sent ? 'تم إرسال الكود بالبريد' : 'تم إصدار الكود — انسخه وسلّمه'); }
          load();
        }).catch(function(err){
          if (guard(err)) return;
          toast((err && err.message) || 'تعذر تنفيذ العملية');
        });
      }

      function load(){
        if (!A) {
          listBox.innerHTML = '<div class="callout callout-warn">' + ic('alert') + '<div><p>واجهة الخادم غير متاحة. سجّل الدخول من جديد.</p></div></div>';
          return;
        }
        var tk = token();
        if (!tk) { guard({status:401}); return; }
        listBox.innerHTML = '<div class="empty-state"><div class="es-ico">' + ic('refresh') + '</div><h2>جارٍ التحميل…</h2></div>';
        A.adminRequests(tk).then(function(data){
          var items = (data && data.requests) || [];
          var counts = (data && data.counts) || {};
          if (countsBox) countsBox.innerHTML = chip('قيد الانتظار', counts.pending||0, 'tag-gold') + chip('مقبول', counts.approved||0, 'tag-blue') + chip('مفعّل', counts.active||0, 'tag-green') + chip('مرفوض', counts.rejected||0, 'tag-rose');
          if (smtpChip) {
            smtpChip.className = 'tag ' + (data.smtp ? 'tag-green' : 'tag-gold');
            smtpChip.textContent = data.smtp ? 'البريد مهيأ' : 'البريد غير مهيأ';
          }
          renderTable(items);
          bind();
        }).catch(function(err){
          if (guard(err)) return;
          listBox.innerHTML = '<div class="callout callout-warn">' + ic('alert') + '<div><p>' + esc((err && err.message) || 'تعذر تحميل الطلبات.') + '</p></div></div>';
        });
      }

      var rf = qs('#adminRefresh'); if (rf) rf.addEventListener('click', load);
      var lo = qs('#adminLogout'); if (lo) lo.addEventListener('click', function(){
        if(!confirm(t('تسجيل خروج المسؤول من هذا الجهاز؟'))) return;
        var done = C.logoutSession ? C.logoutSession() : Promise.resolve();
        done.then(function(){ toast(t('تم تسجيل الخروج')); C.go('#/admin'); });
      });
      load();
    }};
  };

  /* ---------- About ---------- */
  P.about = function () {
    return crumbs([{label:'الرئيسية', href:'#/home'}, {label:'عن المنصة'}]) +
      pageHead('عن COSMADEDZ', 'منصة تكوين <span class="accent">احترافية</span>', 'مرجع عربي عملي لصناعة مواد التجميل والعناية بالجسم: من الأساسيات إلى الجودة.') +
      '<div class="panel"><h2>' + ic('sparkle') + ' ما الذي يقدمه التطبيق؟</h2><ul class="bullet-list"><li>مسارات تعليمية ودروس تفاعلية.</li><li>مكتبة مواد أولية مع تصنيف وظيفي (أسلوب مستوحى من منطق منصات مثل UL Prospector).</li><li>وصفات بنسبة 100% مع حاسبة دفعات وخطوات تصنيع.</li><li>طرق تصنيع ونقاط تحكم حرجة.</li><li>اختبارات، شهادة إتمام، وقوائم جودة.</li><li>عمل دون اتصال بعد أول تحميل (PWA).</li></ul></div>' +
      '<div class="panel" style="margin-top:16px"><h2>' + ic('shield') + ' إخلاء مسؤولية</h2><p class="small">المحتوى تعليمي عام ولا يغني عن التدريب العملي، أو اختبارات السلامة/الاستقرار، أو الاستشارة التنظيمية. تأكد من الامتثال لمتطلبات بلدك قبل التسويق.</p></div>' +
      '<div class="panel" style="margin-top:16px"><h2>' + ic('info') + ' المصدر المرجعي للتصنيف</h2><p class="small">تصنيف المواد الأولية مستوحى من المنطق الوظيفي المستخدم في <strong>UL Prospector — Personal Care</strong> (مرجع للاطلاع): https://www.ulprospector.com/fr/eu/PersonalCare</p></div>' +
      '<div class="panel" style="margin-top:16px"><h2>' + ic('shield') + ' الحقوق</h2><p class="small"><strong>الحقوق محفوظة للمهندس: حاج اسماعيل ابراهيم</strong><br>مهندس مراقبة النوعية والبيوكيمياء، غرداية الجزائر<br>هاتف: <a href="tel:0549659691" dir="ltr">0549659691</a></p></div>';
  };

})();
