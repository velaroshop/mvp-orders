/**
 * Velaro Thank You Page Embed Script
 *
 * This script handles post-purchase upsell offers and confirmation messages
 * on the thank you page after order placement.
 *
 * Usage:
 * <script src="https://mvp-orders.vercel.app/thank-you-embed.js"></script>
 * <div id="velaro-thank-you"></div>
 *
 * The script reads the order ID from URL query parameter: ?order=xxx
 */

(function() {
  'use strict';

  const API_DOMAIN = 'https://mvp-orders.vercel.app';

  /**
   * Get URL query parameter by name
   */
  function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }

  /**
   * State management
   */
  let orderData = null;
  let countdown = 0;
  let countdownInterval = null;

  /**
   * Fetch order data from API
   */
  async function fetchOrderData(orderId) {
    try {
      const response = await fetch(`${API_DOMAIN}/api/thank-you/verify?order=${orderId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch order data');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching order data:', error);
      return null;
    }
  }

  /**
   * Handle postsale acceptance
   */
  async function handleAcceptPostsale(orderId, upsell) {
    try {
      const response = await fetch(`${API_DOMAIN}/api/orders/${orderId}/add-postsale-upsell`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          upsellId: upsell.id,
          title: upsell.title,
          quantity: upsell.quantity,
          price: upsell.price,
          productId: upsell.productId,
          productSku: upsell.productSku,
          productName: upsell.productName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add postsale upsell');
      }

      // Show confirmation message
      showConfirmationMessage(orderData.customerName);
    } catch (error) {
      console.error('Error adding postsale:', error);
      alert('A apărut o eroare. Te rugăm să reîncarci pagina.');
    }
  }

  /**
   * Handle postsale decline
   */
  async function handleDeclinePostsale(orderId) {
    try {
      const response = await fetch(`${API_DOMAIN}/api/orders/${orderId}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to finalize order');
      }

      // Show confirmation message
      showConfirmationMessage(orderData.customerName);
    } catch (error) {
      console.error('Error finalizing order:', error);
      alert('A apărut o eroare. Te rugăm să reîncarci pagina.');
    }
  }

  /**
   * Render postsale offer
   */
  function renderPostsaleOffer(container, data) {
    const upsell = data.postsaleUpsells[0]; // Take first upsell
    const colors = data.storeColors;

    // Calculate countdown
    const expiresAt = new Date(data.queueExpiresAt).getTime();
    const now = Date.now();
    countdown = Math.max(0, Math.floor((expiresAt - now) / 1000));

    const html = `
      <div style="max-width: 100%; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: white;">

        <!-- Title -->
        <div style="text-align: center; margin-bottom: 12px;">
          <h2 style="font-size: 32px; font-weight: 900; margin: 0 0 6px 0; color: #111827; line-height: 1.1;">
            FELICITĂRI!
          </h2>
          <p style="font-size: 15px; font-weight: 600; color: #374151; margin: 0 0 6px 0;">
            AI DEBLOCAT O REDUCERE
          </p>
          <!-- Countdown -->
          <div style="display: inline-flex; align-items: center; gap: 6px; margin-top: 4px;">
            <svg style="width: 18px; height: 18px; color: #dc2626;" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
            </svg>
            <span style="font-size: 15px; font-weight: 700; color: #dc2626;">EXPIRĂ ÎN <span id="countdown-timer">${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}</span></span>
          </div>
        </div>

        <!-- Product Image -->
        ${upsell.mediaUrl ? `
          <div style="text-align: center; margin-bottom: 16px;">
            <img src="${upsell.mediaUrl}" alt="${upsell.title}" style="max-width: 100%; width: 100%; height: auto; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          </div>
        ` : ''}

        <!-- Product Title & Description -->
        <div style="text-align: center; margin-bottom: 16px;">
          <h3 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 6px 0; line-height: 1.3;">
            ${upsell.title}
          </h3>
          ${upsell.description ? `
            <p style="font-size: 14px; color: #111827; margin: 0; line-height: 1.5;">
              ${upsell.description}
            </p>
          ` : ''}
        </div>

        <!-- Pricing -->
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="text-decoration: line-through; color: #6b7280; font-size: 16px; font-weight: 600; margin-bottom: 10px;">
            Preț normal: ${upsell.srp.toFixed(2)} LEI
          </div>
          <div id="discount-badge" style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; border-radius: 10px; padding: 10px 18px; margin: 0 auto 10px auto; display: inline-block; animation: scaleUp 0.6s ease-in-out infinite alternate;">
            <div style="font-size: 24px; font-weight: 900; line-height: 1;">
              -${Math.round(((upsell.srp - upsell.price) / upsell.srp) * 100)}% REDUCERE
            </div>
          </div>
          <div style="font-size: 28px; font-weight: 900; color: ${colors.accent}; line-height: 1;">
            DOAR ${upsell.price.toFixed(2)} LEI
          </div>
        </div>

        <!-- CTA Buttons -->
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button
            id="accept-postsale-btn"
            style="background: ${colors.primary}; color: ${colors.textOnDark || '#ffffff'}; border: none; padding: 16px 40px; font-size: 16px; font-weight: 700; border-radius: 10px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.2s; flex: 1; min-width: 200px; max-width: 300px;"
            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(0,0,0,0.2)';"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)';"
          >
            DA, ADAUGĂ LA COMANDĂ!
          </button>
          <button
            id="decline-postsale-btn"
            style="background: #9ca3af; color: white; border: none; padding: 16px 40px; font-size: 16px; font-weight: 700; border-radius: 10px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.1); transition: all 0.2s; flex: 1; min-width: 200px; max-width: 300px;"
            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(0,0,0,0.15)';"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';"
          >
            NU MULȚUMESC
          </button>
        </div>
      </div>

      <style>
        @keyframes scaleUp {
          0% { transform: scale(1); }
          100% { transform: scale(1.05); }
        }
      </style>
    `;

    container.innerHTML = html;

    // Attach event listeners
    document.getElementById('accept-postsale-btn').addEventListener('click', () => {
      handleAcceptPostsale(data.orderId, upsell);
    });

    document.getElementById('decline-postsale-btn').addEventListener('click', () => {
      handleDeclinePostsale(data.orderId);
    });

    // Start countdown
    startCountdown(data.orderId);
  }

  /**
   * Start countdown timer
   */
  function startCountdown(orderId) {
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }

    countdownInterval = setInterval(() => {
      countdown--;

      if (countdown <= 0) {
        clearInterval(countdownInterval);
        // Auto-finalize and show confirmation
        handleDeclinePostsale(orderId);
        return;
      }

      // Update countdown display
      const timerElement = document.getElementById('countdown-timer');
      if (timerElement) {
        const minutes = Math.floor(countdown / 60);
        const seconds = countdown % 60;
        timerElement.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
      }
    }, 1000);
  }

  /**
   * Show confirmation message
   */
  function showConfirmationMessage(customerName) {
    const container = document.getElementById('velaro-thank-you');
    if (!container) return;

    // Clear countdown
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }

    const html = `
      <div style="max-width: 600px; margin: 60px auto; padding: 40px; text-align: center; background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%); border-radius: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
        <div style="font-size: 64px; margin-bottom: 20px;">✓</div>
        <h2 style="font-size: 32px; font-weight: bold; color: #059669; margin: 0 0 20px 0;">
          Comanda Ta A Fost Confirmată!
        </h2>
        <p style="font-size: 18px; color: #374151; margin: 0 0 10px 0;">
          Mulțumim pentru comandă${customerName ? `, ${customerName}` : ''}!
        </p>
        <p style="font-size: 16px; color: #6b7280; margin: 0; line-height: 1.6;">
          Comanda ta va fi livrată prin curier rapid în <strong>1-3 zile lucrătoare</strong>.<br>
          Vei fi contactat telefonic pentru confirmare.
        </p>
      </div>
    `;

    container.innerHTML = html;
  }

  /**
   * Initialize the thank you page widget
   */
  async function init() {
    const container = document.getElementById('velaro-thank-you');

    if (!container) {
      console.error('Velaro Thank You: Container element #velaro-thank-you not found');
      return;
    }

    // Get order ID from URL
    const orderId = getQueryParam('order');

    if (!orderId) {
      console.error('Velaro Thank You: No order ID found in URL');
      container.innerHTML = '<div style="padding: 40px; text-align: center; color: #dc2626;">Eroare: Comanda nu a fost găsită.</div>';
      return;
    }

    // Show loading state
    container.innerHTML = '<div style="padding: 60px; text-align: center; font-size: 18px; color: #6b7280;">Se încarcă...</div>';

    // Fetch order data
    orderData = await fetchOrderData(orderId);

    if (!orderData) {
      container.innerHTML = '<div style="padding: 40px; text-align: center; color: #dc2626;">Eroare: Nu am putut încărca datele comenzii.</div>';
      return;
    }

    // Show postsale offer or confirmation message
    if (orderData.showPostsale && orderData.postsaleUpsells && orderData.postsaleUpsells.length > 0) {
      renderPostsaleOffer(container, orderData);
    } else {
      showConfirmationMessage(orderData.customerName);
    }
  }

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose global API
  window.VelaroThankYou = {
    init: init,
    version: '1.0.0'
  };
})();
