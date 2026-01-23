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
    // Disable both buttons to prevent multiple clicks
    const acceptBtn = document.getElementById('accept-postsale-btn');
    const declineBtn = document.getElementById('decline-postsale-btn');

    if (acceptBtn) {
      acceptBtn.disabled = true;
      acceptBtn.style.opacity = '0.5';
      acceptBtn.style.cursor = 'not-allowed';
      acceptBtn.textContent = 'SE PROCESEAZĂ...';
    }
    if (declineBtn) {
      declineBtn.disabled = true;
      declineBtn.style.opacity = '0.5';
      declineBtn.style.cursor = 'not-allowed';
    }

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

      // Re-enable buttons on error
      if (acceptBtn) {
        acceptBtn.disabled = false;
        acceptBtn.style.opacity = '1';
        acceptBtn.style.cursor = 'pointer';
        acceptBtn.textContent = 'DA, ADAUGĂ LA OFERTĂ';
      }
      if (declineBtn) {
        declineBtn.disabled = false;
        declineBtn.style.opacity = '1';
        declineBtn.style.cursor = 'pointer';
      }

      alert('A apărut o eroare. Te rugăm să reîncarci pagina.');
    }
  }

  /**
   * Handle postsale decline
   */
  async function handleDeclinePostsale(orderId) {
    // Disable both buttons to prevent multiple clicks
    const acceptBtn = document.getElementById('accept-postsale-btn');
    const declineBtn = document.getElementById('decline-postsale-btn');

    if (acceptBtn) {
      acceptBtn.disabled = true;
      acceptBtn.style.opacity = '0.5';
      acceptBtn.style.cursor = 'not-allowed';
    }
    if (declineBtn) {
      declineBtn.disabled = true;
      declineBtn.style.opacity = '0.5';
      declineBtn.style.cursor = 'not-allowed';
      declineBtn.textContent = 'SE PROCESEAZĂ...';
    }

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

      // Re-enable buttons on error
      if (acceptBtn) {
        acceptBtn.disabled = false;
        acceptBtn.style.opacity = '1';
        acceptBtn.style.cursor = 'pointer';
      }
      if (declineBtn) {
        declineBtn.disabled = false;
        declineBtn.style.opacity = '1';
        declineBtn.style.cursor = 'pointer';
        declineBtn.textContent = 'NU MĂ INTERESEAZĂ';
      }

      alert('A apărut o eroare. Te rugăm să reîncarci pagina.');
    }
  }

  /**
   * Render postsale offer - SPECTACULAR DESIGN
   */
  function renderPostsaleOffer(container, data) {
    const upsell = data.postsaleUpsells[0]; // Take first upsell
    const colors = data.storeColors;

    // Calculate countdown
    const expiresAt = new Date(data.queueExpiresAt).getTime();
    const now = Date.now();
    countdown = Math.max(0, Math.floor((expiresAt - now) / 1000));

    // Calculate discount percentage
    const discountPercent = Math.round(((upsell.srp - upsell.price) / upsell.srp) * 100);

    // Generate sparkle particles
    let particlesHtml = '';
    for (let i = 0; i < 20; i++) {
      const left = Math.random() * 100;
      const top = Math.random() * 100;
      const delay = Math.random() * 3;
      const size = Math.random() * 4 + 2;
      particlesHtml += `<div style="position: absolute; left: ${left}%; top: ${top}%; width: ${size}px; height: ${size}px; background: rgba(255, 215, 0, 0.6); border-radius: 50%; animation: sparkle 3s ease-in-out ${delay}s infinite;"></div>`;
    }

    const html = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: hidden; position: relative;">

        <!-- Animated sparkles/particles background -->
        <div style="position: absolute; inset: 0; overflow: hidden; pointer-events: none;">
          ${particlesHtml}
        </div>

        <!-- Main content - fits mobile screen -->
        <div style="position: relative; z-index: 10; width: 100%; max-width: 400px; padding: 16px; display: flex; flex-direction: column; align-items: center;">

          <!-- COUNTDOWN TIMER -->
          <div style="display: flex; align-items: center; gap: 8px; background: rgba(220, 38, 38, 0.2); border: 1px solid rgba(220, 38, 38, 0.5); border-radius: 9999px; padding: 8px 16px; margin-bottom: 12px; animation: pulse 2s ease-in-out infinite;">
            <svg style="width: 20px; height: 20px; color: #fca5a5;" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
            </svg>
            <span style="font-size: 18px; font-weight: 700; color: #fca5a5;">EXPIRĂ ÎN <span id="countdown-timer">${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}</span></span>
          </div>

          <!-- FELICITĂRI TITLE - Big and Gold -->
          <div style="text-align: center; margin-bottom: 8px;">
            <span style="font-size: 40px; font-weight: 900; color: #FFD700; text-shadow: 0 0 20px #FFD700, 0 0 40px #FFA500, 0 2px 4px rgba(0,0,0,0.5); display: block;">
              FELICITĂRI!
            </span>
          </div>

          <!-- SUBTITLE -->
          <p style="font-size: 14px; font-weight: 600; color: #94a3b8; text-align: center; margin: 0 0 16px 0; letter-spacing: 1px;">
            ⭐ AI DEBLOCAT O REDUCERE LIMITATĂ ⭐
          </p>

          <!-- PRODUCT IMAGE with glow effect - 90-95% width -->
          ${upsell.mediaUrl ? `
            <div style="position: relative; width: 92%; margin-bottom: 16px;">
              <div style="position: absolute; inset: -4px; background: linear-gradient(135deg, #ffd700, #ff6b6b, #ffd700); border-radius: 20px; filter: blur(15px); opacity: 0.6; animation: pulse 3s ease-in-out infinite;"></div>
              <img src="${upsell.mediaUrl}" alt="${upsell.title}" style="position: relative; width: 100%; height: auto; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">

              <!-- Discount badge on image -->
              <div style="position: absolute; top: -12px; right: -12px; background: linear-gradient(135deg, #dc2626, #991b1b); color: white; border-radius: 50%; width: 80px; height: 80px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 900; box-shadow: 0 4px 15px rgba(220, 38, 38, 0.5); animation: bounce 1s ease-in-out infinite;">
                <span style="font-size: 22px; line-height: 1;">-${discountPercent}%</span>
              </div>
            </div>
          ` : ''}

          <!-- OFFER TITLE -->
          <h2 style="font-size: 20px; font-weight: 700; color: white; text-align: center; margin: 0 0 8px 0; line-height: 1.3;">
            ${upsell.title}
          </h2>

          <!-- OFFER DESCRIPTION -->
          ${upsell.description ? `
            <p style="font-size: 14px; color: #cbd5e1; text-align: center; margin: 0 0 16px 0; line-height: 1.5; padding: 0 8px;">
              ${upsell.description}
            </p>
          ` : ''}

          <!-- PRICE SECTION -->
          <div style="text-align: center; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap;">
              <span style="font-size: 18px; color: #64748b; text-decoration: line-through;">${upsell.srp.toFixed(2)} LEI</span>
              <span style="font-size: 16px; color: #64748b;">→</span>
              <span style="font-size: 32px; font-weight: 900; color: #22c55e; text-shadow: 0 0 20px rgba(34, 197, 94, 0.5);">${upsell.price.toFixed(2)} LEI</span>
            </div>
          </div>

          <!-- URGENCY MESSAGE -->
          <p style="font-size: 12px; color: #f87171; text-align: center; margin: 0 0 20px 0; animation: pulse 2s ease-in-out infinite;">
            ⚡ Această ofertă dispare când părăsești pagina! ⚡
          </p>

          <!-- ACTION BUTTONS - Stacked -->
          <div style="width: 100%; display: flex; flex-direction: column; gap: 12px;">
            <button
              id="accept-postsale-btn"
              style="width: 100%; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; border: none; padding: 18px 24px; font-size: 18px; font-weight: 800; border-radius: 12px; cursor: pointer; box-shadow: 0 4px 20px rgba(34, 197, 94, 0.4); transition: all 0.3s; text-transform: uppercase; letter-spacing: 0.5px;"
              onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 6px 25px rgba(34, 197, 94, 0.5)';"
              onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 20px rgba(34, 197, 94, 0.4)';"
            >
              DA, ADAUGĂ LA OFERTĂ
            </button>
            <button
              id="decline-postsale-btn"
              style="width: 100%; background: transparent; color: #64748b; border: 1px solid #334155; padding: 14px 24px; font-size: 14px; font-weight: 600; border-radius: 12px; cursor: pointer; transition: all 0.3s;"
              onmouseover="this.style.borderColor='#475569'; this.style.color='#94a3b8';"
              onmouseout="this.style.borderColor='#334155'; this.style.color='#64748b';"
            >
              NU MĂ INTERESEAZĂ
            </button>
          </div>
        </div>
      </div>

      <style>
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmer {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.2); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-5px) rotate(3deg); }
        }
      </style>
    `;

    container.innerHTML = html;

    // Attach event listeners
    const acceptBtn = document.getElementById('accept-postsale-btn');
    const declineBtn = document.getElementById('decline-postsale-btn');

    if (acceptBtn && declineBtn) {
      acceptBtn.addEventListener('click', () => {
        handleAcceptPostsale(data.orderId, upsell);
      });

      declineBtn.addEventListener('click', () => {
        handleDeclinePostsale(data.orderId);
      });
    } else {
      console.error('Velaro Thank You: Buttons not found in DOM');
    }

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
   * Show confirmation message - SPECTACULAR DESIGN matching postsale
   */
  function showConfirmationMessage(customerName) {
    const container = document.getElementById('velaro-thank-you');
    if (!container) return;

    // Clear countdown
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }

    // Generate sparkle particles
    let particlesHtml = '';
    for (let i = 0; i < 15; i++) {
      const left = Math.random() * 100;
      const top = Math.random() * 100;
      const delay = Math.random() * 3;
      const size = Math.random() * 4 + 2;
      particlesHtml += `<div style="position: absolute; left: ${left}%; top: ${top}%; width: ${size}px; height: ${size}px; background: rgba(34, 197, 94, 0.6); border-radius: 50%; animation: sparkle 3s ease-in-out ${delay}s infinite;"></div>`;
    }

    const html = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: hidden; position: relative;">

        <!-- Animated sparkles/particles background -->
        <div style="position: absolute; inset: 0; overflow: hidden; pointer-events: none;">
          ${particlesHtml}
        </div>

        <!-- Main content -->
        <div style="position: relative; z-index: 10; width: 100%; max-width: 400px; padding: 24px; display: flex; flex-direction: column; align-items: center;">

          <!-- SUCCESS BADGE - Big green checkmark -->
          <div style="width: 100px; height: 100px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; box-shadow: 0 0 40px rgba(34, 197, 94, 0.5), 0 10px 30px rgba(0,0,0,0.3); animation: pulse 2s ease-in-out infinite;">
            <svg style="width: 50px; height: 50px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>

          <!-- TITLE - Gold like postsale -->
          <div style="text-align: center; margin-bottom: 12px;">
            <span style="font-size: 32px; font-weight: 900; color: #22c55e; text-shadow: 0 0 20px rgba(34, 197, 94, 0.6), 0 2px 4px rgba(0,0,0,0.3); display: block;">
              COMANDĂ CONFIRMATĂ!
            </span>
          </div>

          <!-- Customer name greeting -->
          <p style="font-size: 18px; font-weight: 600; color: white; text-align: center; margin: 0 0 20px 0;">
            Mulțumim pentru comandă${customerName ? `, <span style="color: #ffd700;">${customerName}</span>` : ''}!
          </p>

          <!-- Info box -->
          <div style="width: 100%; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 16px; padding: 20px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <svg style="width: 20px; height: 20px; color: white;" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"></path>
                  <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7h4.05a1 1 0 01.95.68l1.39 4.19a1 1 0 01.11.47V14a1 1 0 01-1 1h-.05a2.5 2.5 0 01-4.9 0H14V7z"></path>
                </svg>
              </div>
              <div>
                <p style="font-size: 16px; font-weight: 700; color: white; margin: 0;">Livrare prin curier rapid</p>
                <p style="font-size: 14px; color: #94a3b8; margin: 0;">1-3 zile lucrătoare</p>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <svg style="width: 20px; height: 20px; color: white;" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"></path>
                  <path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd"></path>
                </svg>
              </div>
              <div>
                <p style="font-size: 16px; font-weight: 700; color: white; margin: 0;">Plată la livrare</p>
                <p style="font-size: 14px; color: #94a3b8; margin: 0;">Cash sau card la curier</p>
              </div>
            </div>
          </div>

          <!-- Trust message -->
          <p style="font-size: 14px; color: #64748b; text-align: center; margin: 0; line-height: 1.6;">
            Vei primi un SMS sau email cu detaliile comenzii și urmărirea coletului.
          </p>

        </div>
      </div>

      <style>
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 40px rgba(34, 197, 94, 0.5), 0 10px 30px rgba(0,0,0,0.3); }
          50% { transform: scale(1.05); box-shadow: 0 0 60px rgba(34, 197, 94, 0.7), 0 15px 40px rgba(0,0,0,0.4); }
        }
      </style>
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
    version: '2.1.0'
  };
})();
