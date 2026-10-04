/*!
 * RStar7 V3.1 — Shared Calculator Engine
 * Refactored from the per-page inline scripts of RStar7-V3-Professional (V3).
 * All original formulas are preserved; input validation, error handling and
 * edge-case fixes (NaN / Infinity / empty inputs) were added without changing
 * the visible design of the site.
 *
 * Runs in the browser (window.R7) and in Node/Bun (module.exports) for testing.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) { module.exports = api; }
  else { root.R7 = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------ */
  var nf = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
  var nf2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function fmt(x) {
    if (typeof x === 'number') {
      if (!Number.isFinite(x)) return '—';
      // round to 2 decimals to kill floating point noise, then format
      var r = Math.round(x * 100) / 100;
      return Number.isInteger(r) ? nf.format(r) : nf2.format(r);
    }
    return String(x);
  }

  function money(x) { return '\u20B9' + fmt(x); }

  function err(msg) { return { ok: false, error: msg }; }

  function ok(main, sub, rows) {
    var r = { ok: true, main: main };
    if (sub) r.sub = sub;
    if (rows) r.rows = rows;
    return r;
  }

  function Validation(message) { this.message = message; this.isValidation = true; }
  function fail(msg) { throw new Validation(msg); }

  /** Get raw trimmed string; throws when empty. */
  function req(vals, id, label) {
    var raw = vals && vals[id] !== undefined && vals[id] !== null ? String(vals[id]).trim() : '';
    if (raw === '') fail('Please enter ' + label + '.');
    return raw;
  }

  /** Get a finite number; throws when empty / not a number / below min / above max. */
  function num(vals, id, label, opts) {
    opts = opts || {};
    var raw = req(vals, id, label);
    var x = Number(raw);
    if (!Number.isFinite(x)) fail(label + ' must be a valid number.');
    if (opts.min !== undefined && x < opts.min) fail(label + ' must be at least ' + String(opts.min) + '.');
    if (opts.max !== undefined && x > opts.max) fail(label + ' must be at most ' + String(opts.max) + '.');
    return x;
  }

  /** Integer variant. */
  function int(vals, id, label, opts) {
    var x = num(vals, id, label, opts);
    if (Math.floor(x) !== x) fail(label + ' must be a whole number.');
    return x;
  }

  /** Parse ISO date (yyyy-mm-dd) into a LOCAL Date; rejects invalid calendar dates. */
  function parseDate(vals, id, label) {
    var raw = req(vals, id, label);
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!m) fail('Please choose a valid ' + label + '.');
    var y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    var dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
      fail('Please choose a valid ' + label + '.');
    }
    return dt;
  }

  /** Parse hh:mm (24h). Returns minutes since midnight. */
  function parseTime(vals, id, label) {
    var raw = req(vals, id, label);
    var m = /^(\d{1,2}):(\d{2})$/.exec(raw);
    var h = m ? Number(m[1]) : NaN, mi = m ? Number(m[2]) : NaN;
    if (!m || h < 0 || h > 23 || mi < 0 || mi > 59) fail('Please enter a valid ' + label + ' (HH:MM).');
    return h * 60 + mi;
  }

  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = a % b; a = b; b = t; }
    return a;
  }

  /** Whole years / months / days between two dates. */
  function ageParts(birth, asof) {
    if (asof < birth) fail('"As of" date must be after the date of birth.');
    var y = asof.getFullYear() - birth.getFullYear();
    var m = asof.getMonth() - birth.getMonth();
    var d = asof.getDate() - birth.getDate();
    if (d < 0) {
      m--;
      d += new Date(asof.getFullYear(), asof.getMonth(), 0).getDate();
    }
    if (m < 0) { y--; m += 12; }
    return { years: y, months: m, days: d };
  }

  function ageText(p) {
    var parts = [];
    if (p.years) parts.push(p.years + (p.years === 1 ? ' year' : ' years'));
    if (p.months) parts.push(p.months + (p.months === 1 ? ' month' : ' months'));
    if (p.days || parts.length === 0) parts.push(p.days + (p.days === 1 ? ' day' : ' days'));
    return parts.join(', ');
  }

  var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function inDate(d) { // en-IN display, e.g. 15/8/2027 → "15/8/2027" via toLocaleDateString
    return d.toLocaleDateString('en-IN') + ' (' + WEEKDAYS[d.getDay()] + ')';
  }

  /* ------------------------------------------------------------------ *
   * Calculator implementations
   * ------------------------------------------------------------------ */
  var CALCS = {

    /* ------------------------- FINANCE ------------------------------ */
    'emi-calculator': function (v) {
      var p = num(v, 'principal', 'Loan amount', { min: 0 });
      var months = int(v, 'months', 'Loan term (months)', { min: 1 });
      var rate = num(v, 'rate', 'Annual interest rate', { min: 0 });
      var i = rate / 1200;
      var emi = i > 0 ? p * i * Math.pow(1 + i, months) / (Math.pow(1 + i, months) - 1) : p / months;
      return ok(
        money(emi) + ' / month',
        'For ' + money(p) + ' over ' + months + ' months at ' + fmt(rate) + '% p.a.',
        [
          ['Total payment', money(emi * months)],
          ['Total interest', money(emi * months - p)]
        ]
      );
    },

    'loan-calculator': function (v) {
      var p = num(v, 'principal', 'Loan amount', { min: 0 });
      var months = int(v, 'months', 'Loan term (months)', { min: 1 });
      var rate = num(v, 'rate', 'Annual interest rate', { min: 0 });
      var i = rate / 1200;
      var emi = i > 0 ? p * i * Math.pow(1 + i, months) / (Math.pow(1 + i, months) - 1) : p / months;
      return ok(
        money(emi) + ' / month',
        'Estimated monthly instalment (same as EMI)',
        [
          ['Total repayment', money(emi * months)],
          ['Total interest', money(emi * months - p)]
        ]
      );
    },

    'sip-calculator': function (v) {
      var p = num(v, 'monthly', 'Monthly investment', { min: 0 });
      var years = num(v, 'years', 'Investment period (years)', { min: 0 });
      var rate = num(v, 'rate', 'Expected annual return', { min: 0 });
      var m = Math.round(years * 12);
      var i = rate / 1200;
      var f = Math.pow(1 + i, m);
      var maturity = i > 0 ? p * ((f - 1) / i) * (1 + i) : p * m; // FIX: 0% rate no longer NaN
      var invested = p * m;
      return ok(
        money(maturity),
        'Maturity value after ' + m + ' monthly investments',
        [
          ['Total invested', money(invested)],
          ['Estimated gain', money(maturity - invested)]
        ]
      );
    },

    'fd-calculator': function (v) {
      var p = num(v, 'principal', 'Deposit amount', { min: 0 });
      var t = num(v, 'years', 'Time period (years)', { min: 0 });
      var rate = num(v, 'rate', 'Interest rate (p.a.)', { min: 0 });
      var maturity = p * Math.pow(1 + rate / 100, t); // annual compounding (original formula)
      return ok(
        money(maturity),
        'Fixed deposit maturity at ' + fmt(rate) + '% p.a. (compounded yearly)',
        [
          ['Principal', money(p)],
          ['Interest earned', money(maturity - p)]
        ]
      );
    },

    'rd-calculator': function (v) {
      var p = num(v, 'monthly', 'Monthly deposit', { min: 0 });
      var m = int(v, 'months', 'Time period (months)', { min: 1 });
      var rate = num(v, 'rate', 'Interest rate (p.a.)', { min: 0 });
      var i = rate / 1200;
      var maturity = p * m + p * m * (m + 1) / 2 * i; // standard RD approximation (original)
      return ok(
        money(maturity),
        'Approx. maturity value (quarterly-compounding estimate)',
        [
          ['Total deposited', money(p * m)],
          ['Estimated interest', money(maturity - p * m)]
        ]
      );
    },

    'simple-interest-calculator': function (v) {
      var p = num(v, 'principal', 'Principal amount', { min: 0 });
      var rate = num(v, 'rate', 'Interest rate (p.a.)', { min: 0 });
      var t = num(v, 'years', 'Time period (years)', { min: 0 });
      var si = p * rate / 100 * t;
      return ok(
        money(si),
        'Simple interest at ' + fmt(rate) + '% p.a. for ' + fmt(t) + ' year(s)',
        [['Total amount (P + I)', money(p + si)]]
      );
    },

    'compound-interest-calculator': function (v) {
      var p = num(v, 'principal', 'Principal amount', { min: 0 });
      var rate = num(v, 'rate', 'Interest rate (p.a.)', { min: 0 });
      var t = num(v, 'years', 'Time period (years)', { min: 0 });
      var times = int(v, 'times', 'Compounding frequency (per year)', { min: 1 }); // FIX: was Infinity at 0
      var a = p * Math.pow(1 + rate / 100 / times, times * t);
      return ok(
        money(a),
        'Future value compounded ' + times + ' time(s) per year',
        [
          ['Principal', money(p)],
          ['Interest earned', money(a - p)]
        ]
      );
    },

    'gst-calculator': function (v) {
      var mode = req(v, 'mode', 'GST mode');
      var a = num(v, 'amount', 'Amount', { min: 0 });
      var g = num(v, 'rate', 'GST rate', { min: 0 });
      if (mode === 'remove') {
        var base = a / (1 + g / 100); // NEW: remove GST (reverse calculation)
        return ok(money(base), 'Base price before GST', [['GST amount', money(a - base)]]);
      }
      var gst = a * g / 100;
      return ok(money(a + gst), 'Total price including GST', [['GST amount', money(gst)]]);
    },

    'discount-calculator': function (v) {
      var a = num(v, 'amount', 'Original price', { min: 0 });
      var d = num(v, 'rate', 'Discount percentage', { min: 0 });
      var save = a * d / 100;
      return ok(
        money(a - save),
        'Sale price after ' + fmt(d) + '% discount',
        [['You save', money(save)]]
      );
    },

    'salary-calculator': function (v) {
      var salary = num(v, 'salary', 'Monthly salary (gross)', { min: 0 });
      var ded = num(v, 'deduction', 'Monthly deductions', { min: 0 });
      var take = salary - ded;
      if (take < 0) fail('Deductions cannot be more than the gross salary.');
      return ok(
        money(take) + ' / month',
        'Estimated take-home salary',
        [
          ['Annual take-home', money(take * 12)],
          ['Annual gross', money(salary * 12)]
        ]
      );
    },

    /* --------------------------- MATH ------------------------------- */
    'percentage-calculator': function (v) {
      var mode = req(v, 'mode', 'Calculation type');
      var a = num(v, 'value', 'First value');
      var b = num(v, 'percent', 'Second value');
      if (mode === 'what') {          // A is what % of B
        if (b === 0) fail('Second value cannot be 0 for this calculation.');
        return ok(fmt(a / b * 100) + '%', fmt(a) + ' is what percentage of ' + fmt(b) + '?');
      }
      if (mode === 'change') {        // % change from A to B
        if (a === 0) fail('Percentage change from 0 is undefined — enter a non-zero first value.');
        var ch = (b - a) / Math.abs(a) * 100;
        return ok((ch >= 0 ? '+' : '') + fmt(ch) + '%', (ch >= 0 ? 'Increase' : 'Decrease') + ' from ' + fmt(a) + ' to ' + fmt(b));
      }
      var x = a * b / 100;            // default: A % of B
      return ok(fmt(x), fmt(b) + '% of ' + fmt(a));
    },

    'average-calculator': function (v) {
      var raw = req(v, 'numbers', 'numbers (separate them with commas)');
      var list = raw.split(/[,\s]+/).filter(function (s) { return s.length > 0; }).map(Number);
      var valid = list.filter(function (x) { return Number.isFinite(x); });
      if (valid.length === 0) fail('Please enter at least one valid number.');
      var sum = valid.reduce(function (a, b) { return a + b; }, 0);
      return ok(
        fmt(sum / valid.length),
        'Average of ' + valid.length + ' number(s)',
        [['Sum', fmt(sum)], ['Count', String(valid.length)]]
      );
    },

    'ratio-calculator': function (v) {
      var a = num(v, 'a', 'First value (A)');
      var b = num(v, 'b', 'Second value (B)');
      if (a === 0 && b === 0) fail('Both values cannot be 0.');
      // scale decimals to whole numbers (FIX: was flaky on decimal input)
      var sa = String(a), sb = String(b);
      var da = sa.indexOf('.') >= 0 ? sa.split('.')[1].length : 0;
      var db = sb.indexOf('.') >= 0 ? sb.split('.')[1].length : 0;
      var k = Math.pow(10, Math.max(da, db));
      var ia = Math.round(a * k), ib = Math.round(b * k);
      var g = gcd(ia, ib) || 1;
      return ok((ia / g) + ' : ' + (ib / g), fmt(a) + ' : ' + fmt(b) + ' simplified');
    },

    'fraction-calculator': function (v) {
      var op = req(v, 'op', 'Operation');
      var a = int(v, 'a', 'Numerator of first fraction');
      var b = int(v, 'b', 'Denominator of first fraction', { min: 1, max: undefined });
      var c = int(v, 'c', 'Numerator of second fraction');
      var d = int(v, 'd', 'Denominator of second fraction', { min: 1 });
      var n, den;
      if (op === '+') { n = a * d + c * b; den = b * d; }
      else if (op === '-') { n = a * d - c * b; den = b * d; }
      else if (op === '*') { n = a * c; den = b * d; }
      else { n = a * d; den = b * c; }   // divide: (a/b) / (c/d)
      if (den === 0) fail('Division by a zero fraction is not possible.');
      if (n === 0) return ok('0', a + '/' + b + ' ' + op + ' ' + c + '/' + d);
      var sign = (n < 0) ? -1 : 1;
      n = Math.abs(n);
      var g = gcd(n, den) || 1;
      n = n / g; den = den / g;
      var whole = Math.floor(n / den), rem = n % den;
      var label = a + '/' + b + ' ' + op + ' ' + c + '/' + d;
      if (den === 1) return ok((sign * n) + '', label + ' = ' + (sign * n));
      if (whole > 0) return ok(sign * whole + ' ' + rem + '/' + den, label + ' (mixed number)', [['As a fraction', (sign === -1 ? '-' : '') + n + '/' + den]]);
      return ok((sign === -1 ? '-' : '') + n + '/' + den, label);
    },

    'profit-loss-calculator': function (v) {
      var c = num(v, 'cost', 'Cost price', { min: 0 });
      var s = num(v, 'sell', 'Selling price', { min: 0 });
      var x = s - c;
      var rows;
      if (x >= 0) {
        rows = [['Profit amount', money(x)]];
        if (c > 0) rows.push(['Profit % (on cost)', fmt(x / c * 100) + '%']); // FIX: cost=0 no longer Infinity
        if (s > 0) rows.push(['Profit margin (on sale)', fmt(x / s * 100) + '%']);
        return ok('Profit: ' + money(x), 'Sold above cost price', rows);
      }
      rows = [['Loss amount', money(-x)]];
      if (c > 0) rows.push(['Loss % (on cost)', fmt(-x / c * 100) + '%']);
      return ok('Loss: ' + money(-x), 'Sold below cost price', rows);
    },

    /* ------------------------ DAILY LIFE ---------------------------- */
    'age-calculator': function (v) {
      var birth = parseDate(v, 'birth', 'date of birth');
      var asofRaw = v && v.asof ? String(v.asof).trim() : '';
      var asof = asofRaw ? parseDate(v, 'asof', '"as of" date') : new Date(new Date().toDateString()); // today, local midnight
      var p = ageParts(birth, asof);
      return ok(
        ageText(p),
        'Age as on ' + asof.toLocaleDateString('en-IN'),
        [['Total days', String(Math.floor((asof - birth) / 86400000))]]
      );
    },

    'date-difference-calculator': function (v) {
      var a = parseDate(v, 'start', 'start date');
      var b = parseDate(v, 'end', 'end date');
      if (b < a) fail('End date must be on or after the start date.');
      var days = Math.round((b - a) / 86400000);
      var p = ageParts(a, b);
      return ok(
        days + (days === 1 ? ' day' : ' days'),
        'From ' + a.toLocaleDateString('en-IN') + ' to ' + b.toLocaleDateString('en-IN'),
        [
          ['Weeks', fmt(days / 7)],
          ['Calendar difference', ageText(p)]
        ]
      );
    },

    'days-calculator': function (v) {
      var op = req(v, 'op', 'Operation');
      var d = parseDate(v, 'date', 'date');
      var days = int(v, 'days', 'Number of days');
      var r = new Date(d.getTime());
      r.setDate(r.getDate() + (op === 'subtract' ? -days : days)); // NEW: add or subtract
      return ok(
        r.toLocaleDateString('en-IN'),
        (op === 'subtract' ? days + ' day(s) before ' : days + ' day(s) after ') + d.toLocaleDateString('en-IN'),
        [['Day of week', WEEKDAYS[r.getDay()]]]
      );
    },

    'time-duration-calculator': function (v) {
      var a = parseTime(v, 'start', 'start time');
      var b = parseTime(v, 'end', 'end time');
      var x = b - a;
      var note = '';
      if (x < 0) { x += 1440; note = ' (end time treated as next day)'; }
      return ok(
        Math.floor(x / 60) + ' h ' + (x % 60) + ' min',
        'Duration between the two times' + note,
        [['Total minutes', String(x)]]
      );
    },

    'bmi-calculator': function (v) {
      var w = num(v, 'weight', 'Weight (kg)', { min: 1 });
      var hcm = num(v, 'height', 'Height (cm)', { min: 1 });
      var bmi = w / Math.pow(hcm / 100, 2);
      var cat = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal weight' : bmi < 30 ? 'Overweight' : 'Obese';
      return ok(
        fmt(bmi),
        'Category: ' + cat + ' (WHO classification)',
        [['Healthy range', '18.5 – 24.9']]
      );
    },

    'fuel-cost-calculator': function (v) {
      var dist = num(v, 'distance', 'Trip distance (km)', { min: 0 });
      var eff = num(v, 'efficiency', 'Fuel efficiency (km per litre)', { min: 0.1 }); // FIX: no more Infinity
      var price = num(v, 'price', 'Fuel price (per litre)', { min: 0 });
      var litres = dist / eff;
      return ok(
        money(litres * price),
        'Estimated fuel cost for ' + fmt(dist) + ' km',
        [
          ['Fuel needed', fmt(litres) + ' litres'],
          ['Effective cost / km', money(litres * price / dist)]
        ]
      );
    },

    'electricity-cost-calculator': function (v) {
      var units = num(v, 'units', 'Units consumed (kWh)', { min: 0 });
      var rate = num(v, 'rate', 'Rate per unit', { min: 0 });
      return ok(
        money(units * rate),
        'Estimated electricity cost',
        [
          ['Units', fmt(units) + ' kWh'],
          ['Rate per unit', money(rate)]
        ]
      );
    },

    'tip-calculator': function (v) {
      var bill = num(v, 'bill', 'Bill amount', { min: 0 });
      var tipPct = num(v, 'tip', 'Tip percentage', { min: 0 });
      var people = int(v, 'people', 'Number of people', { min: 1 });
      var tip = bill * tipPct / 100;
      var total = bill + tip;
      return ok(
        money(tip),
        'Tip amount at ' + fmt(tipPct) + '%',
        [
          ['Total with tip', money(total)],
          ['Per person (' + people + ')', money(total / people)]
        ]
      );
    },

    'area-calculator': function (v) {
      var shape = req(v, 'shape', 'Shape');
      var a = num(v, 'a', 'Length / radius / side', { min: 0 });
      var area, formula;
      if (shape === 'circle') {
        area = Math.PI * a * a; formula = '\u03C0 \u00D7 r\u00B2';
      } else if (shape === 'triangle') {
        var b = num(v, 'b', 'Base of triangle', { min: 0 });
        var h = num(v, 'h', 'Height of triangle', { min: 0 });
        area = 0.5 * b * h; formula = '\u00BD \u00D7 base \u00D7 height';
      } else if (shape === 'square') {
        area = a * a; formula = 'side \u00B2';
      } else {
        var w = num(v, 'b', 'Width of rectangle', { min: 0 });
        area = a * w; formula = 'length \u00D7 width';
      }
      return ok(fmt(area) + ' sq units', 'Area of ' + shape + ' \u2014 formula used: ' + formula);
    },

    'length-converter': function (v) {
      var u = { mm: 0.001, cm: 0.01, m: 1, km: 1000, 'in': 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 };
      var val = num(v, 'value', 'Value to convert');
      var from = req(v, 'from', 'unit to convert from');
      var to = req(v, 'to', 'unit to convert to');
      if (!u[from]) fail('Choose a valid unit to convert from.');
      if (!u[to]) fail('Choose a valid unit to convert to.');
      var metres = val * u[from];
      return ok(
        fmt(metres / u[to]) + ' ' + to,
        fmt(val) + ' ' + from + ' converted to ' + to,
        [['In metres', fmt(metres) + ' m']]
      );
    }
  };

  /**
   * Execute a calculator.
   * @param {string} id    calculator id, e.g. 'emi-calculator'
   * @param {object} vals  map of field id → raw value (strings)
   * @returns {{ok:true, main:string, sub?:string, rows?:Array}|{ok:false, error:string}}
   */
  function exec(id, vals) {
    try {
      var fn = CALCS[id];
      if (!fn) return err('Unknown calculator.');
      return fn(vals || {});
    } catch (e) {
      if (e && e.isValidation) return err(e.message);
      return err('Please enter valid values.');
    }
  }

  return {
    exec: exec,
    fmt: fmt,
    money: money,
    parseDate: parseDate,
    parseTime: parseTime,
    ageParts: ageParts,
    ageText: ageText,
    gcd: gcd,
    _calcs: CALCS
  };
});
