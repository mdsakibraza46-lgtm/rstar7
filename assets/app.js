/*!
 * RStar7 V3.1 — Tools index search filter.
 * The tool cards are now static HTML (crawlable by search engines);
 * this script only filters/hides them as the user types.
 */
(function () {
  var s = document.getElementById('search');
  if (!s) return;
  var cards = [].slice.call(document.querySelectorAll('#toolGrid .tool'));
  var nr = document.getElementById('noResults');
  s.addEventListener('input', function () {
    var q = s.value.toLowerCase().trim();
    var shown = 0;
    cards.forEach(function (c) {
      var hit = !q || (c.getAttribute('data-search') || '').indexOf(q) >= 0;
      c.hidden = !hit;
      if (hit) shown++;
    });
    if (nr) nr.style.display = shown ? 'none' : 'block';
  });
})();
