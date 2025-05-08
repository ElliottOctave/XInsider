  let navbarLoaded = false;
  let footerLoaded = false;

  function tryShowContent() {
    if (navbarLoaded && footerLoaded) {
      document.getElementById('loading-overlay').style.opacity = "0";
      setTimeout(() => {
        document.getElementById('loading-overlay').style.display = 'none';
      }, 500); // makes a smooth transition
      
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
