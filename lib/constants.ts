export const APP_NAME = 'Startup Sphere'
export const CURRENCY_SYMBOL = '₹'
export const DATE_FORMAT = 'DD/MM/YYYY'
export const DEFAULT_TIMEZONE = 'Asia/Kolkata'
export const DEFAULT_COUNTRY_CODE = '+91'
export const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
export const GST_RATES = [0, 5, 12, 18, 28]
export const ITEMS_PER_PAGE = 20
export const GROQ_MODEL_DEFAULT = 'llama-3.3-70b-versatile'
export const MAX_FILE_SIZE_MB = 10

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Delhi',
  'Lakshadweep', 'Puducherry', 'Ladakh', 'Jammu and Kashmir'
]

export const INDIAN_FESTIVALS_2026 = [
  { name: 'Makar Sankranti', date: '2026-01-14' },
  { name: 'Republic Day', date: '2026-01-26' },
  { name: 'Holi', date: '2026-03-22' },
  { name: 'Gudi Padwa', date: '2026-03-30' },
  { name: 'Ram Navami', date: '2026-04-07' },
  { name: 'Baisakhi', date: '2026-04-14' },
  { name: 'Eid ul-Fitr', date: '2026-04-20' },
  { name: 'Akshaya Tritiya', date: '2026-04-28' },
  { name: 'Eid ul-Adha', date: '2026-06-27' },
  { name: 'Independence Day', date: '2026-08-15' },
  { name: 'Raksha Bandhan', date: '2026-08-30' },
  { name: 'Janmashtami', date: '2026-09-07' },
  { name: 'Ganesh Chaturthi', date: '2026-09-16' },
  { name: 'Navratri Start', date: '2026-10-08' },
  { name: 'Dussehra', date: '2026-10-18' },
  { name: 'Diwali', date: '2026-11-07' },
  { name: 'Bhai Dooj', date: '2026-11-09' },
  { name: 'Guru Nanak Jayanti', date: '2026-11-22' },
  { name: 'Christmas', date: '2026-12-25' },
  { name: 'New Year Eve', date: '2026-12-31' },
]

export const WHATSAPP_REMINDER_TEMPLATES = {
  day3: (customerName: string, invoiceNo: string, amount: string, businessName: string, upiLink: string) =>
    `Hello ${customerName}, friendly reminder that invoice #${invoiceNo} for ${amount} from ${businessName} was due 3 days ago. Please make the payment at your earliest convenience. Pay here: ${upiLink} 🙏`,
  
  day7: (customerName: string, invoiceNo: string, amount: string, businessName: string) =>
    `Dear ${customerName}, your payment of ${amount} for invoice #${invoiceNo} is now 7 days overdue. Please clear this at the earliest to avoid any inconvenience. Contact us if you have any concerns.`,
  
  day15: (customerName: string, invoiceNo: string, amount: string, businessName: string) =>
    `URGENT: ${customerName}, invoice #${invoiceNo} for ${amount} is significantly overdue. Please make immediate payment or contact ${businessName} to discuss. This may affect future transactions.`
}

export const TRENDING_REEL_FORMATS = [
  {
    id: 'mera-baccha',
    name: 'Mera Baccha Hai Tu',
    description: 'Shopkeeper treats customer like family to reveal offer',
    example: '👴 Customer: "Bhaiya itne mehange?" 😎 Owner: "Arey mera baccha hai tu!"',
    best_for: 'Sales, Discounts, Festive offers',
    vibe: 'funny',
    characters: ['Customer', 'Shop Owner'],
  },
  {
    id: 'rasode-mein',
    name: 'Rasode Mein Kaun Tha',
    description: 'Dramatic investigation-style reveal of your product/offer',
    example: 'Investigator style questioning leading to product reveal',
    best_for: 'Product launch, New menu, Mystery offer',
    vibe: 'dramatic',
    characters: ['Investigator', 'Suspect/Owner'],
  },
  {
    id: 'expectation-reality',
    name: 'Expectation vs Reality',
    description: 'Show what customers fear vs your amazing actual service',
    example: 'EXPECTATION: Bad service 😱 REALITY: Amazing experience ✨',
    best_for: 'Any business to showcase quality',
    vibe: 'funny',
    characters: ['Customer', 'Narrator'],
  },
  {
    id: 'pov-bestfriend',
    name: 'POV: Tumhara Best Friend',
    description: 'Your business as a best friend solving customer problems',
    example: 'POV: Your bestie just opened a salon and gives you VIP treatment',
    best_for: 'Services, Apps, Consultants, Salons',
    vibe: 'emotional',
    characters: ['Best Friend/Owner', 'Customer'],
  },
  {
    id: 'before-after',
    name: 'Before vs After',
    description: 'Powerful transformation story using your product/service',
    example: 'Before: Struggling ❌ After: Thriving with us ✅',
    best_for: 'Beauty, Fitness, Interior, Coaching',
    vibe: 'motivational',
    characters: ['Customer before', 'Customer after'],
  },
  {
    id: 'dukaan-band',
    name: 'Dukaan Band Karo',
    description: 'Boss says shut it down because prices are too low',
    example: '😤 Boss: "Itne kam mein doge toh dukaan band ho jayegi!" 😂',
    best_for: 'Sales, Clearance, Discount offers',
    vibe: 'dramatic',
    characters: ['Boss', 'Employee', 'Happy Customer'],
  },
  {
    id: '3-types',
    name: '3 Types of Customers',
    description: 'Relatable breakdown of funny customer personality types',
    example: 'Type 1: The Bargainer 💸 Type 2: The Indecisive 🤔 Type 3: The Regular ❤️',
    best_for: 'Any business, extremely relatable',
    vibe: 'funny',
    characters: ['Owner/Narrator', 'Customer types'],
  },
  {
    id: 'ye-dil-maange',
    name: 'Ye Dil Maange More',
    description: 'Customer keeps coming back wanting more of your product',
    example: 'Customer tries product once... comes back 5 times same day 😂',
    best_for: 'Food, Beverages, Addictive products',
    vibe: 'funny',
    characters: ['Customer', 'Amused Owner'],
  },
  {
    id: 'rate-card-reveal',
    name: 'Rate Card Reveal',
    description: 'Dramatic price reveal that shocks customer positively',
    example: '😱 "Sirf itna?!" Camera zooms in on happy shocked face',
    best_for: 'Affordable services, Value products',
    vibe: 'dramatic',
    characters: ['Customer', 'Owner'],
  },
  {
    id: 'day-in-life',
    name: 'Day in My Life',
    description: 'Behind the scenes of your business builds trust',
    example: '6 AM: Prep begins ☀️ ... 9 PM: Happy customers served 🌙',
    best_for: 'Any business, builds authenticity',
    vibe: 'relatable',
    characters: ['Owner/Employee'],
  },
  {
    id: 'customer-roast',
    name: 'Customer Roast',
    description: 'Lovingly roast common funny customer behaviors',
    example: '"Us customer ke liye jo sirf Sunday 11:59 PM pe order karta hai" 😂',
    best_for: 'Restaurants, Retail, Any service',
    vibe: 'funny',
    characters: ['Owner/Narrator'],
  },
  {
    id: 'kya-chahiye',
    name: 'Kya Chahiye Tumhe',
    description: 'Q&A format showing your full range of products/services',
    example: '"Healthy food chahiye?" ✅ "Tasty bhi?" ✅ "Affordable?" ✅',
    best_for: 'Multi-product businesses, Restaurants',
    vibe: 'informative',
    characters: ['Owner', 'Customer'],
  },
]

export const INDIAN_CONTENT_OCCASIONS = [
  { name: 'No Occasion (General)', type: 'general' },
  { name: 'Diwali 🪔', type: 'festival' },
  { name: 'Eid 🌙', type: 'festival' },
  { name: 'Holi 🎨', type: 'festival' },
  { name: 'Ganesh Chaturthi 🐘', type: 'festival' },
  { name: 'Navratri 💃', type: 'festival' },
  { name: 'Dussehra', type: 'festival' },
  { name: 'Christmas 🎄', type: 'festival' },
  { name: 'New Year 🎆', type: 'festival' },
  { name: 'Independence Day 🇮🇳', type: 'national' },
  { name: 'Republic Day 🇮🇳', type: 'national' },
  { name: 'Valentine\'s Day ❤️', type: 'occasion' },
  { name: 'Weekend Sale 🛍️', type: 'sale' },
  { name: 'Grand Opening 🎊', type: 'business' },
  { name: 'Anniversary Sale 🎂', type: 'business' },
  { name: 'Flash Sale ⚡', type: 'sale' },
  { name: 'New Product Launch 🚀', type: 'business' },
  { name: 'Thank You Customers ❤️', type: 'engagement' },
]
