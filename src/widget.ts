/**
 * HeyAspen Booking Widget
 *
 * Drop-in reservation widget for restaurant websites.
 * Uses Shadow DOM for full style isolation — zero conflicts with the host page.
 *
 * Usage:
 *   <script
 *     src="https://widget.heyaspen.ai/book.js"
 *     data-restaurant-id="ChIJxxx"
 *     data-restaurant-name="The Caribou Club"
 *     data-color="#6c63ff"
 *     data-label="Reserve a table"
 *   ></script>
 */

const API_BASE =
  (window as Window & { HEYASPEN_API?: string }).HEYASPEN_API ||
  'https://api.heyaspen.ai'

interface Slot {
  time: string
  tablesAvailable: number
}

type Step = 'date-party' | 'time' | 'contact' | 'confirm'

// ─── Utility ────────────────────────────────────────────────────────────────

function fmt12(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`
}

function fmtDate(date: string): string {
  const d = new Date(date + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function minDateStr(): string {
  return todayStr()
}

// ─── API ────────────────────────────────────────────────────────────────────

async function fetchSlots(
  restaurantId: string,
  date: string,
  partySize: number
): Promise<Slot[]> {
  const res = await fetch(
    `${API_BASE}/v1/restaurants/${restaurantId}/availability?date=${date}&party_size=${partySize}`
  )
  if (!res.ok) throw new Error('Unable to load availability')
  const json = await res.json()
  return json.data?.slots ?? []
}

async function bookReservation(
  restaurantId: string,
  payload: {
    customerName: string
    customerPhone: string
    partySize: number
    date: string
    time: string
    specialRequests?: string
  }
): Promise<{ id: number }> {
  const res = await fetch(
    `${API_BASE}/v1/restaurants/${restaurantId}/reservations`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  )
  const json = await res.json()
  if (!res.ok) throw new Error(json.message || 'Unable to complete booking')
  return json.data.reservation
}

// ─── Styles ─────────────────────────────────────────────────────────────────

function getStyles(accent: string): string {
  return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :host { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

    /* Trigger button */
    .trigger {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 22px;
      background: ${accent};
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s, transform 0.1s;
      white-space: nowrap;
    }
    .trigger:hover { opacity: 0.88; }
    .trigger:active { transform: scale(0.97); }

    /* Backdrop */
    .backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(4px);
      z-index: 999998;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .backdrop.open { display: flex; }

    /* Modal */
    .modal {
      background: #111114;
      border: 1px solid #2a2a32;
      border-radius: 20px;
      width: 100%;
      max-width: 420px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 24px 60px rgba(0,0,0,0.6);
      animation: slideUp 0.2s ease;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Modal header */
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 20px;
      border-bottom: 1px solid #1e1e24;
    }
    .modal-title { font-size: 17px; font-weight: 700; color: #f0f0f5; }
    .modal-sub   { font-size: 12px; color: #8888a0; margin-top: 2px; }
    .close-btn {
      width: 30px; height: 30px;
      background: #1a1a1f;
      border: 1px solid #2a2a32;
      border-radius: 50%;
      color: #8888a0;
      cursor: pointer;
      font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
      flex-shrink: 0;
    }
    .close-btn:hover { background: #222228; color: #f0f0f5; }

    /* Steps indicator */
    .steps {
      display: flex;
      gap: 4px;
      padding: 14px 20px 0;
    }
    .step-dot {
      flex: 1;
      height: 3px;
      border-radius: 2px;
      background: #2a2a32;
      transition: background 0.2s;
    }
    .step-dot.active { background: ${accent}; }

    /* Body */
    .modal-body { padding: 20px; }

    /* Form fields */
    label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: #8888a0;
      margin-bottom: 6px;
    }
    input, select, textarea {
      width: 100%;
      padding: 11px 14px;
      background: #1a1a1f;
      border: 1px solid #2a2a32;
      border-radius: 10px;
      color: #f0f0f5;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s;
      appearance: none;
    }
    input:focus, select:focus, textarea:focus { border-color: ${accent}; }
    input::placeholder, textarea::placeholder { color: #55556a; }
    textarea { resize: none; }

    .field { margin-bottom: 14px; }
    .row   { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }

    /* Time slots grid */
    .slots-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    .slot-btn {
      padding: 10px 6px;
      background: #1a1a1f;
      border: 1px solid #2a2a32;
      border-radius: 10px;
      color: #f0f0f5;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      text-align: center;
      transition: all 0.15s;
    }
    .slot-btn:hover { border-color: ${accent}; background: #222228; }
    .slot-btn.selected { background: ${accent}20; border-color: ${accent}; color: ${accent}; }
    .slot-btn .avail  { display: block; font-size: 10px; color: #55556a; margin-top: 2px; }
    .slot-btn.selected .avail { color: ${accent}99; }

    /* No slots */
    .no-slots {
      text-align: center;
      padding: 20px;
      color: #55556a;
      font-size: 13px;
    }

    /* Confirm summary */
    .summary {
      background: #1a1a1f;
      border: 1px solid #2a2a32;
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 16px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      padding: 4px 0;
    }
    .summary-label { color: #8888a0; }
    .summary-value { color: #f0f0f5; font-weight: 500; }

    /* Success */
    .success {
      text-align: center;
      padding: 24px 20px;
    }
    .success-icon {
      width: 56px; height: 56px;
      background: #22c55e18;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 14px;
      font-size: 26px;
    }
    .success-title { font-size: 18px; font-weight: 700; color: #f0f0f5; margin-bottom: 6px; }
    .success-sub   { font-size: 13px; color: #8888a0; line-height: 1.5; }
    .success-id    { font-size: 12px; color: #55556a; margin-top: 12px; }

    /* Buttons */
    .btn-row { display: flex; gap: 10px; margin-top: 4px; }
    .btn {
      flex: 1;
      padding: 12px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
    }
    .btn-ghost {
      background: transparent;
      border: 1px solid #2a2a32;
      color: #8888a0;
    }
    .btn-ghost:hover { background: #1a1a1f; color: #f0f0f5; }
    .btn-primary {
      background: ${accent};
      color: #fff;
    }
    .btn-primary:hover { opacity: 0.88; }
    .btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

    /* Error */
    .error {
      background: #ef444418;
      border: 1px solid #ef444430;
      border-radius: 8px;
      color: #f87171;
      font-size: 13px;
      padding: 10px 12px;
      margin-bottom: 12px;
    }

    /* Spinner */
    .spinner {
      display: inline-block;
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,0.25);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin-right: 6px;
      vertical-align: middle;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Powered by */
    .powered {
      text-align: center;
      padding: 12px;
      font-size: 11px;
      color: #3a3a44;
      border-top: 1px solid #1e1e24;
    }
    .powered a { color: ${accent}; text-decoration: none; }
  `
}

// ─── Widget Class ────────────────────────────────────────────────────────────

class BookingWidget {
  private root: ShadowRoot
  private restaurantId: string
  private restaurantName: string
  private accent: string

  // State
  private step: Step = 'date-party'
  private date = todayStr()
  private partySize = 2
  private selectedTime = ''
  private slots: Slot[] = []
  private loadingSlots = false
  private customerName = ''
  private customerPhone = ''
  private specialRequests = ''
  private bookingId: number | null = null
  private error = ''
  private submitting = false

  constructor(
    host: HTMLElement,
    restaurantId: string,
    restaurantName: string,
    accent: string
  ) {
    this.restaurantId = restaurantId
    this.restaurantName = restaurantName
    this.accent = accent

    this.root = host.attachShadow({ mode: 'open' })
    this.render()
  }

  private render() {
    this.root.innerHTML = `
      <style>${getStyles(this.accent)}</style>
      <button class="trigger" id="open-btn">
        🗓 ${this.getTriggerLabel()}
      </button>
      <div class="backdrop" id="backdrop">
        <div class="modal" role="dialog" aria-modal="true">
          ${this.renderModal()}
        </div>
      </div>
    `
    this.bindEvents()
  }

  private getTriggerLabel(): string {
    const el = this.root.host
    return el.getAttribute('data-label') || 'Reserve a table'
  }

  private renderModal(): string {
    if (this.bookingId !== null) return this.renderSuccess()

    const steps: Step[] = ['date-party', 'time', 'contact', 'confirm']
    const stepIdx = steps.indexOf(this.step)

    return `
      <div class="modal-header">
        <div>
          <div class="modal-title">${this.restaurantName}</div>
          <div class="modal-sub">Book a table</div>
        </div>
        <button class="close-btn" id="close-btn" aria-label="Close">✕</button>
      </div>

      <div class="steps">
        ${steps.map((_, i) => `<div class="step-dot ${i <= stepIdx ? 'active' : ''}"></div>`).join('')}
      </div>

      <div class="modal-body">
        ${this.error ? `<div class="error">${this.error}</div>` : ''}
        ${this.renderStep()}
      </div>

      <div class="powered">
        Powered by <a href="https://heyaspen.ai" target="_blank">HeyAspen</a>
      </div>
    `
  }

  private renderStep(): string {
    switch (this.step) {
      case 'date-party': return this.renderDateParty()
      case 'time':       return this.renderTime()
      case 'contact':    return this.renderContact()
      case 'confirm':    return this.renderConfirm()
    }
  }

  private renderDateParty(): string {
    return `
      <div class="row">
        <div>
          <label>Date</label>
          <input type="date" id="date-input" value="${this.date}" min="${minDateStr()}" />
        </div>
        <div>
          <label>Party size</label>
          <input type="number" id="party-input" value="${this.partySize}" min="1" max="20" />
        </div>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" id="next-btn">Check availability →</button>
      </div>
    `
  }

  private renderTime(): string {
    if (this.loadingSlots) {
      return `<div class="no-slots"><span class="spinner"></span> Finding available times…</div>`
    }
    if (this.slots.length === 0) {
      return `
        <div class="no-slots">
          No tables available for ${fmtDate(this.date)} for ${this.partySize}.<br>
          Try a different date or party size.
        </div>
        <div class="btn-row">
          <button class="btn btn-ghost" id="back-btn">← Back</button>
        </div>
      `
    }
    return `
      <div style="font-size:13px;color:#8888a0;margin-bottom:12px;">
        ${fmtDate(this.date)} · Party of ${this.partySize}
      </div>
      <div class="slots-grid">
        ${this.slots.map(s => `
          <button class="slot-btn ${this.selectedTime === s.time ? 'selected' : ''}"
                  data-time="${s.time}">
            ${fmt12(s.time)}
            <span class="avail">${s.tablesAvailable} left</span>
          </button>
        `).join('')}
      </div>
      <div class="btn-row">
        <button class="btn btn-ghost" id="back-btn">← Back</button>
        <button class="btn btn-primary" id="next-btn" ${!this.selectedTime ? 'disabled' : ''}>
          Continue →
        </button>
      </div>
    `
  }

  private renderContact(): string {
    return `
      <div style="font-size:13px;color:#8888a0;margin-bottom:14px;">
        ${fmtDate(this.date)} · ${fmt12(this.selectedTime)} · Party of ${this.partySize}
      </div>
      <div class="field">
        <label>Your name</label>
        <input type="text" id="name-input" placeholder="Jane Smith" value="${this.customerName}" required />
      </div>
      <div class="field">
        <label>Phone number</label>
        <input type="tel" id="phone-input" placeholder="+1 (970) 555-0100" value="${this.customerPhone}" required />
      </div>
      <div class="field">
        <label>Special requests <span style="color:#55556a;">(optional)</span></label>
        <textarea id="notes-input" rows="2" placeholder="Window seat, high chair, anniversary…" maxlength="500">${this.specialRequests}</textarea>
      </div>
      <div class="btn-row">
        <button class="btn btn-ghost" id="back-btn">← Back</button>
        <button class="btn btn-primary" id="next-btn">Review →</button>
      </div>
    `
  }

  private renderConfirm(): string {
    return `
      <div class="summary">
        <div class="summary-row">
          <span class="summary-label">Restaurant</span>
          <span class="summary-value">${this.restaurantName}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Date & time</span>
          <span class="summary-value">${fmtDate(this.date)} at ${fmt12(this.selectedTime)}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Party size</span>
          <span class="summary-value">${this.partySize} guests</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Name</span>
          <span class="summary-value">${this.customerName}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Phone</span>
          <span class="summary-value">${this.customerPhone}</span>
        </div>
        ${this.specialRequests ? `
        <div class="summary-row">
          <span class="summary-label">Requests</span>
          <span class="summary-value" style="max-width:200px;text-align:right;">${this.specialRequests}</span>
        </div>` : ''}
      </div>
      <p style="font-size:12px;color:#55556a;margin-bottom:14px;">
        You'll receive a text confirmation at ${this.customerPhone}.
      </p>
      <div class="btn-row">
        <button class="btn btn-ghost" id="back-btn">← Edit</button>
        <button class="btn btn-primary" id="confirm-btn" ${this.submitting ? 'disabled' : ''}>
          ${this.submitting ? '<span class="spinner"></span>Booking…' : 'Confirm booking'}
        </button>
      </div>
    `
  }

  private renderSuccess(): string {
    return `
      <div class="success">
        <div class="success-icon">✓</div>
        <div class="success-title">You're booked!</div>
        <div class="success-sub">
          ${fmtDate(this.date)} at ${fmt12(this.selectedTime)}<br>
          Party of ${this.partySize} at ${this.restaurantName}<br><br>
          A confirmation text is on its way to<br>${this.customerPhone}.
        </div>
        <div class="success-id">Confirmation #${this.bookingId}</div>
      </div>
      <div class="powered">
        Powered by <a href="https://heyaspen.ai" target="_blank">HeyAspen</a>
      </div>
    `
  }

  private bindEvents() {
    const backdrop = this.root.getElementById('backdrop')!
    const openBtn  = this.root.getElementById('open-btn')!

    openBtn.addEventListener('click', () => this.open())
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close()
    })

    this.bindModalEvents()
  }

  private bindModalEvents() {
    // Close
    this.root.getElementById('close-btn')?.addEventListener('click', () => this.close())

    // Back
    this.root.getElementById('back-btn')?.addEventListener('click', () => {
      this.error = ''
      const order: Step[] = ['date-party', 'time', 'contact', 'confirm']
      const i = order.indexOf(this.step)
      if (i > 0) { this.step = order[i - 1]; this.rerender() }
    })

    // Step-specific
    switch (this.step) {
      case 'date-party': this.bindDateParty(); break
      case 'time':       this.bindTime();      break
      case 'contact':    this.bindContact();   break
      case 'confirm':    this.bindConfirm();   break
    }
  }

  private bindDateParty() {
    this.root.getElementById('date-input')?.addEventListener('change', (e) => {
      this.date = (e.target as HTMLInputElement).value
    })
    this.root.getElementById('party-input')?.addEventListener('change', (e) => {
      this.partySize = parseInt((e.target as HTMLInputElement).value) || 2
    })
    this.root.getElementById('next-btn')?.addEventListener('click', async () => {
      this.step = 'time'
      this.slots = []
      this.selectedTime = ''
      this.loadingSlots = true
      this.rerender()
      try {
        this.slots = await fetchSlots(this.restaurantId, this.date, this.partySize)
      } catch {
        this.slots = []
      } finally {
        this.loadingSlots = false
        this.rerender()
      }
    })
  }

  private bindTime() {
    this.root.querySelectorAll<HTMLButtonElement>('.slot-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedTime = btn.dataset.time!
        this.rerender()
      })
    })
    this.root.getElementById('next-btn')?.addEventListener('click', () => {
      if (!this.selectedTime) return
      this.step = 'contact'
      this.rerender()
    })
  }

  private bindContact() {
    this.root.getElementById('next-btn')?.addEventListener('click', () => {
      const name  = (this.root.getElementById('name-input')  as HTMLInputElement).value.trim()
      const phone = (this.root.getElementById('phone-input') as HTMLInputElement).value.trim()
      const notes = (this.root.getElementById('notes-input') as HTMLTextAreaElement).value.trim()

      if (!name)  { this.setError('Please enter your name.');          return }
      if (!phone) { this.setError('Please enter your phone number.');  return }

      this.customerName     = name
      this.customerPhone    = phone
      this.specialRequests  = notes
      this.error            = ''
      this.step             = 'confirm'
      this.rerender()
    })
  }

  private bindConfirm() {
    this.root.getElementById('confirm-btn')?.addEventListener('click', async () => {
      this.submitting = true
      this.error = ''
      this.rerender()
      try {
        const result = await bookReservation(this.restaurantId, {
          customerName:    this.customerName,
          customerPhone:   this.customerPhone,
          partySize:       this.partySize,
          date:            this.date,
          time:            this.selectedTime,
          specialRequests: this.specialRequests || undefined
        })
        this.bookingId  = result.id
        this.submitting = false
        this.rerender()
      } catch (err: unknown) {
        this.submitting = false
        this.setError(err instanceof Error ? err.message : 'Unable to complete booking. Please try again.')
      }
    })
  }

  private setError(msg: string) {
    this.error = msg
    this.rerender()
  }

  private open() {
    this.root.getElementById('backdrop')!.classList.add('open')
    document.body.style.overflow = 'hidden'
  }

  private close() {
    this.root.getElementById('backdrop')!.classList.remove('open')
    document.body.style.overflow = ''
  }

  private rerender() {
    const modal = this.root.querySelector('.modal')
    if (!modal) return
    modal.innerHTML = this.renderModal()
    this.bindModalEvents()
  }
}

// ─── Auto-init ───────────────────────────────────────────────────────────────

function init() {
  const scripts = document.querySelectorAll<HTMLScriptElement>(
    'script[data-restaurant-id]'
  )

  scripts.forEach(script => {
    const restaurantId   = script.getAttribute('data-restaurant-id') || ''
    const restaurantName = script.getAttribute('data-restaurant-name') || 'Reserve a Table'
    const accent         = script.getAttribute('data-color') || '#6c63ff'

    if (!restaurantId) return

    // Create host element and insert after the script tag
    const host = document.createElement('span')
    script.parentNode?.insertBefore(host, script.nextSibling)
    new BookingWidget(host, restaurantId, restaurantName, accent)
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
