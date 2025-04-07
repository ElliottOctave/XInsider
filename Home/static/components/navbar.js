fetch('/Home/static/components/navbar.html')
  .then(res => res.text())
  .then(data => {
    document.getElementById('navbar-container').innerHTML = data;
    document.dispatchEvent(new Event("navbarLoaded"));
  });
