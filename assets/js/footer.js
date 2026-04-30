(function() {

  var FOOTER_HTML = `
<footer>
  <div class="container">
    <div class="footer-promo">
      <p>Built for crypto curious minds. Free crypto sentiment checker, real data and no noise.</p>
    </div>
    <div class="footer-links">
      <a href="/about.html">About</a>
      <a href="/contact.html">Contact</a>
      <a href="/editorial-policy.html">Editorial Policy</a>
      <a href="/disclaimer.html">Disclaimer</a>
      <a href="/privacy.html">Privacy</a>
      <a href="/advertise.html">Advertise</a>
    </div>
    <p class="footer-note">&copy; <span id="footer-year"></span> CoinGyaan.com</p>
  </div>
</footer>`;

  // Inject footer into placeholder
  var placeholder = document.getElementById('site-footer');
  if (placeholder) {
    placeholder.outerHTML = FOOTER_HTML;
  }

  // Set year
  document.addEventListener('DOMContentLoaded', function() {
    var yr = document.getElementById('footer-year');
    if (yr) yr.textContent = new Date().getFullYear();
  });

  // Fallback if DOMContentLoaded already fired
  var yr = document.getElementById('footer-year');
  if (yr) yr.textContent = new Date().getFullYear();

})();
