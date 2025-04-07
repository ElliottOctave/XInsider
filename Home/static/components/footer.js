fetch('/Home/static/components/footer.html')
  .then(res => res.text())
  .then(data => {
    document.getElementById('footer-container').innerHTML = data;
    document.dispatchEvent(new Event("footerLoaded"));
  });
