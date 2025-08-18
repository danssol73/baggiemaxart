window.ArtSite = (function () {
  const MANIFEST_URL = 'assets/data/manifest.json';

  // Initialize dropdown functionality
  function initDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown');
    
    dropdowns.forEach(dropdown => {
      const button = dropdown.querySelector('.dropbtn');
      const content = dropdown.querySelector('.dropdown-content');
      
      if (!button || !content) return;
      
      // Handle button click
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Close other dropdowns
        dropdowns.forEach(other => {
          if (other !== dropdown) {
            other.classList.remove('open');
            const otherBtn = other.querySelector('.dropbtn');
            if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
          }
        });
        
        // Toggle this dropdown
        const isOpen = dropdown.classList.contains('open');
        dropdown.classList.toggle('open');
        button.setAttribute('aria-expanded', !isOpen);
      });
      
      // Handle keyboard navigation
      button.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          button.click();
        } else if (e.key === 'Escape') {
          dropdown.classList.remove('open');
          button.setAttribute('aria-expanded', 'false');
          button.focus();
        }
      });
      
      // Handle clicks on dropdown items
      content.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
          dropdown.classList.remove('open');
          button.setAttribute('aria-expanded', 'false');
        }
      });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown')) {
        dropdowns.forEach(dropdown => {
          dropdown.classList.remove('open');
          const button = dropdown.querySelector('.dropbtn');
          if (button) button.setAttribute('aria-expanded', 'false');
        });
      }
    });
    
    // Close dropdowns on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        dropdowns.forEach(dropdown => {
          dropdown.classList.remove('open');
          const button = dropdown.querySelector('.dropbtn');
          if (button) button.setAttribute('aria-expanded', 'false');
        });
      }
    });
  }

  async function loadManifest() {
    const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load manifest.json');
    return res.json();
  }

  // Build a card with a GLightbox anchor
  function renderCard(item) {
    const { src, thumb, title, caption, category } = item;
    const a = document.createElement('a');
    a.href = src;
    a.className = 'card';
    a.setAttribute('data-gallery', category);
    a.setAttribute('data-glightbox', `title: ${escapeHtml(title)}; description: ${escapeHtml(caption || '')}`);

    const img = document.createElement('img');
    img.className = 'thumb';
    img.src = thumb || src;
    img.alt = title || 'Artwork';
    img.loading = 'lazy';
    a.appendChild(img);

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<div class="title">${escapeHtml(title || '')}</div>` + (caption ? `<div class="caption">${escapeHtml(caption)}</div>` : '');
    a.appendChild(meta);

    return a;
  }

  function escapeHtml(s=''){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }

  function initLightbox() {
    if (window._glb) window._glb.destroy();
    window._glb = GLightbox({
      selector: 'a.card',
      touchNavigation: true,
      loop: true,
      plyr: { css: '' }
    });
  }

  function renderLatest(allItems) {
    const latest = [...allItems]
      .sort((a, b) => new Date(b.added || 0) - new Date(a.added || 0))
      .slice(0, 8);
    const host = document.getElementById('latest-grid');
    if (!host) return;
    host.innerHTML = '';
    latest.forEach(item => host.appendChild(renderCard(item)));
    initLightbox();
  }

  function renderGallery(manifest) {
    const grid = document.getElementById('gallery-grid');
    const filters = document.getElementById('filters');
    if (!grid || !filters) return;

    const categories = Object.keys(manifest.categories);
    filters.innerHTML = '';
    const pills = [];

    // Create filter pills with improved accessibility
    categories.forEach((cat, index) => {
      const pill = document.createElement('button');
      pill.className = 'pill';
      pill.textContent = cat;
      pill.setAttribute('aria-pressed', 'false');
      pill.setAttribute('role', 'tab');
      pill.setAttribute('tabindex', index === 0 ? '0' : '-1');
      
      pill.onclick = () => {
        pills.forEach(p => {
          p.classList.remove('active');
          p.setAttribute('aria-pressed', 'false');
          p.setAttribute('tabindex', '-1');
        });
        pill.classList.add('active');
        pill.setAttribute('aria-pressed', 'true');
        pill.setAttribute('tabindex', '0');
        pill.focus();
        window.location.hash = '#' + encodeURIComponent(cat);
        populate(cat);
      };
      
      // Add keyboard navigation
      pill.onkeydown = (e) => {
        let targetIndex = pills.indexOf(pill);
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          targetIndex = (targetIndex + 1) % pills.length;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          targetIndex = (targetIndex - 1 + pills.length) % pills.length;
        } else if (e.key === 'Home') {
          e.preventDefault();
          targetIndex = 0;
        } else if (e.key === 'End') {
          e.preventDefault();
          targetIndex = pills.length - 1;
        } else {
          return;
        }
        pills[targetIndex].click();
      };
      
      pills.push(pill);
      filters.appendChild(pill);
    });

    function populate(cat) {
      const items = manifest.categories[cat] || [];
      grid.innerHTML = '';
      
      if (items.length === 0) {
        grid.innerHTML = '<div class="empty-category">No artworks in this category yet.</div>';
        return;
      }
      
      items.forEach(i => {
        if (i && i.src && i.title) { // Validate item before rendering
          grid.appendChild(renderCard(i));
        }
      });
      initLightbox();
    }

    // Pick from hash or default to first
    const target = decodeURIComponent((window.location.hash || '').replace('#', ''));
    const initial = categories.includes(target) ? target : categories[0];
    const initialPill = pills.find(p => p.textContent === initial);
    if (initialPill) {
      initialPill.classList.add('active');
      initialPill.setAttribute('aria-pressed', 'true');
      initialPill.setAttribute('tabindex', '0');
    }
    populate(initial);
  }

  function showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
      <div class="error-message">
        <h3>Oops! Something went wrong</h3>
        <p>${message}</p>
        <button onclick="location.reload()" class="button">Try Again</button>
      </div>
    `;
  }

  function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
      <div class="loading-message">
        <div class="loading-spinner"></div>
        <p>Loading gallery...</p>
      </div>
    `;
  }

  async function initHome() {
    // Initialize dropdowns first
    initDropdowns();
    
    const container = document.getElementById('latest-grid');
    if (!container) return;
    
    showLoading('latest-grid');
    
    try {
      const manifest = await loadManifest();
      
      // Validate manifest structure
      if (!manifest || !manifest.categories || typeof manifest.categories !== 'object') {
        throw new Error('Invalid gallery data format');
      }
      
      const all = Object.entries(manifest.categories).flatMap(([category, items]) => {
        if (!Array.isArray(items)) return [];
        return items
          .filter(item => item && item.src && item.title) // Validate required fields
          .map(i => ({ ...i, category }));
      });
      
      if (all.length === 0) {
        throw new Error('No gallery items found');
      }
      
      renderLatest(all);
    } catch (e) {
      console.error('Gallery loading error:', e);
      showError('latest-grid', 'Unable to load the latest artworks. Please check your connection and try again.');
    }
  }

  async function initGallery() {
    // Initialize dropdowns first
    initDropdowns();
    
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    
    showLoading('gallery-grid');
    
    try {
      const manifest = await loadManifest();
      
      // Validate manifest structure
      if (!manifest || !manifest.categories || typeof manifest.categories !== 'object') {
        throw new Error('Invalid gallery data format');
      }
      
      const categoryCount = Object.keys(manifest.categories).length;
      if (categoryCount === 0) {
        throw new Error('No gallery categories found');
      }
      
      renderGallery(manifest);
    } catch (e) {
      console.error('Gallery loading error:', e);
      showError('gallery-grid', 'Unable to load the gallery. Please check your connection and try again.');
    }
  }

  return { initHome, initGallery, initDropdowns };
})();
