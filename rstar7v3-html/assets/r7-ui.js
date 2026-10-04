/*!
 * RStar7 V3.1 — Calculator UI glue.
 * Reads the form fields, runs the shared R7 engine and renders the result.
 * Replaces the duplicated inline script that every V3 page carried.
 */
function r7submit(form) {
  var vals = {};
  [].forEach.call(form.querySelectorAll('input,select'), function (f) {
    vals[f.id] = f.value;
  });
  var id = document.body.getAttribute('data-tool');
  var res = window.R7.exec(id, vals);
  var box = document.getElementById('result');
  box.classList.remove('error');
  if (res.ok) {
    var html = '<b>Result</b><div class="result-value">' + res.main + '</div>';
    if (res.sub) html += '<div class="result-sub">' + res.sub + '</div>';
    if (res.rows) {
      html += '<div class="result-rows">' + res.rows.map(function (r) {
        return '<div><span>' + r[0] + '</span><b>' + r[1] + '</b></div>';
      }).join('') + '</div>';
    }
    box.innerHTML = html;
  } else {
    box.classList.add('error');
    box.innerHTML = '<b>Please check your input</b><div class="result-sub">' + res.error + '</div>';
  }
}

/* Dynamic footer year */
(function () {
  var y = document.getElementById('yr');
  if (y) y.textContent = String(new Date().getFullYear());
})();
