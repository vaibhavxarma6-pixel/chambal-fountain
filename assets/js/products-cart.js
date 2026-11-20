(function () {
  'use strict';

  var STORAGE_KEY = 'cfBriefCart';
  var WHATSAPP_NUMBER = '919829029406';

  var grid = document.getElementById('shopGrid');
  var filters = document.getElementById('filters');
  var shopCount = document.getElementById('shopCount');
  var cartToggle = document.getElementById('cartToggle');
  var cartClose = document.getElementById('cartClose');
  var cartOverlay = document.getElementById('cartOverlay');
  var cartDrawer = document.getElementById('cartDrawer');
  var cartBody = document.getElementById('cartBody');
  var cartCount = document.getElementById('cartCount');
  var cartTotalCount = document.getElementById('cartTotalCount');
  var sendBrief = document.getElementById('sendBrief');
  var clearCart = document.getElementById('clearCart');

  if (!grid || !cartToggle || !cartDrawer) return;

  var productMap = {};
  Array.prototype.forEach.call(document.querySelectorAll('.add-btn'), function (btn) {
    productMap[btn.dataset.id] = {
      id: btn.dataset.id,
      name: btn.dataset.name,
      family: btn.dataset.family,
      spec: btn.dataset.spec,
      image: btn.dataset.image
    };
  });

  function readCart() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function saveCart(cart) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      /* storage may be unavailable - cart still works in this session */
    }
  }

  var cart = readCart();

  function totalItems() {
    return Object.keys(cart).reduce(function (sum, key) {
      return sum + (Math.max(0, parseInt(cart[key], 10) || 0));
    }, 0);
  }

  function updateButtons() {
    Array.prototype.forEach.call(document.querySelectorAll('.add-btn'), function (btn) {
      var active = (parseInt(cart[btn.dataset.id], 10) || 0) > 0;
      btn.classList.toggle('is-added', active);
      btn.textContent = active ? '✓ Added — add another' : '+ Add to Brief';
    });
  }

  function renderCart() {
    var count = totalItems();
    cartCount.textContent = String(count);
    cartTotalCount.textContent = String(count);
    cartCount.classList.toggle('is-empty', count === 0);

    var keys = Object.keys(cart).filter(function (key) {
      return (parseInt(cart[key], 10) || 0) > 0 && productMap[key];
    });

    if (!keys.length) {
      cartBody.innerHTML = '<div class="cart-empty"><span>🛒</span><p>Your brief is empty.<br>Add fountain designs from the product list to build your WhatsApp brief.</p></div>';
      sendBrief.disabled = true;
      sendBrief.style.opacity = '.55';
      return;
    }

    sendBrief.disabled = false;
    sendBrief.style.opacity = '1';

    cartBody.innerHTML = keys.map(function (key, index) {
      var item = productMap[key];
      var qty = parseInt(cart[key], 10) || 0;
      return '' +
        '<div class="cart-item">' +
          '<img src="' + item.image + '" alt="' + item.name + '">' +
          '<div class="cart-item-main">' +
            '<h3>' + item.name + '</h3>' +
            '<small>' + item.family + ' · ' + item.spec + '</small>' +
            '<div class="qty">' +
              '<button type="button" data-act="minus" data-id="' + key + '" aria-label="Decrease quantity of ' + item.name + '">−</button>' +
              '<span>' + qty + '</span>' +
              '<button type="button" data-act="plus" data-id="' + key + '" aria-label="Increase quantity of ' + item.name + '">+</button>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="cart-remove" data-act="remove" data-id="' + key + '" aria-label="Remove ' + item.name + ' from brief">Remove</button>' +
        '</div>';
    }).join('');
  }

  function openCart() {
    cartDrawer.classList.add('is-open');
    cartOverlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    cartClose.focus();
  }

  function closeCart() {
    cartDrawer.classList.remove('is-open');
    cartOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  grid.addEventListener('click', function (event) {
    var btn = event.target.closest('.add-btn');
    if (!btn) return;
    var id = btn.dataset.id;
    cart[id] = (parseInt(cart[id], 10) || 0) + 1;
    saveCart(cart);
    updateButtons();
    renderCart();
    openCart();
  });

  cartBody.addEventListener('click', function (event) {
    var btn = event.target.closest('button[data-act]');
    if (!btn) return;
    var id = btn.dataset.id;
    var act = btn.dataset.act;
    if (act === 'plus') {
      cart[id] = (parseInt(cart[id], 10) || 0) + 1;
    } else if (act === 'minus') {
      cart[id] = Math.max(0, (parseInt(cart[id], 10) || 0) - 1);
      if (cart[id] === 0) delete cart[id];
    } else if (act === 'remove') {
      delete cart[id];
    }
    saveCart(cart);
    updateButtons();
    renderCart();
  });

  filters.addEventListener('click', function (event) {
    var btn = event.target.closest('button[data-f]');
    if (!btn) return;
    Array.prototype.forEach.call(filters.querySelectorAll('button'), function (b) {
      b.classList.toggle('on', b === btn);
    });
    var family = btn.dataset.f;
    var shown = 0;
    Array.prototype.forEach.call(grid.querySelectorAll('.product-card'), function (card) {
      var visible = family === 'all' || card.dataset.family === family;
      card.style.display = visible ? '' : 'none';
      if (visible) shown += 1;
    });
    shopCount.textContent = 'Showing ' + shown + (shown === 1 ? ' design' : ' designs');
  });

  cartToggle.addEventListener('click', openCart);
  cartClose.addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeCart();
  });

  clearCart.addEventListener('click', function () {
    cart = {};
    saveCart(cart);
    updateButtons();
    renderCart();
  });

  sendBrief.addEventListener('click', function () {
    var keys = Object.keys(cart).filter(function (key) {
      return (parseInt(cart[key], 10) || 0) > 0 && productMap[key];
    });
    if (!keys.length) return;

    var lines = [
      'Hello Chambal Fountain,',
      '',
      'I would like a quote for the following fountain designs:',
      ''
    ];
    keys.forEach(function (key, index) {
      var item = productMap[key];
      var qty = parseInt(cart[key], 10) || 0;
      lines.push((index + 1) + '. ' + item.name + ' (' + item.family + ') - Qty ' + qty);
      lines.push('   ' + item.spec);
    });
    lines.push('');
    lines.push('Please prepare a project-based quote in rupees.');
    lines.push('My site details: [area size / indoor or outdoor / city]');
    lines.push('I can share a site photograph on WhatsApp.');

    var message = lines.join('\n');
    var url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);
    window.open(url, '_blank', 'noopener,noreferrer');
  });

  updateButtons();
  renderCart();
})();
