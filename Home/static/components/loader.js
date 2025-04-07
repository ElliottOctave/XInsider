  let navbarLoaded = false;
  let footerLoaded = false;

  function tryShowContent() {
    if (navbarLoaded && footerLoaded) {
      document.getElementById('loading-overlay').style.display = 'none';
      document.getElementById('main-content').style.display = 'block';
    }
  }

  document.addEventListener('navbarLoaded', () => {
    navbarLoaded = true;
    tryShowContent();
  });

  document.addEventListener('footerLoaded', () => {
    footerLoaded = true;
    tryShowContent();
  });
