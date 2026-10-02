"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { useBusinessContext } from "@/lib/hooks/use-business-context"
import { useBranch } from "@/components/providers/branch-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { 
  Sparkles, 
  X, 
  Camera, 
  Zap, 
  Loader2, 
  RefreshCw, 
  Calendar, 
  TrendingUp, 
  Search, 
  Check, 
  ChevronDown, 
  FileDown, 
  AlertTriangle,
  Play,
  Pause,
  Copy,
  Download,
  Video,
  Clapperboard,
  Eye,
  Smile,
  Globe,
  Radio,
  BookOpen
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

import { TrendBanner } from "@/components/ai-marketing/TrendBanner"
import { TrendResearch } from "@/components/ai-marketing/TrendResearch"
import { ContentCalendar, CalendarItem } from "@/components/ai-marketing/ContentCalendar"
import { TRENDING_REEL_FORMATS, INDIAN_CONTENT_OCCASIONS } from "@/lib/constants"

export default function AIMarketingPage() {
  const supabaseRef = useRef(createClient())
  const { user } = useAuth()
  const { ownerId: ctxOwnerId } = useBusinessContext()
  const { activeBranchId } = useBranch()
  const { toast } = useToast()

  const [userEmail, setUserEmail] = useState("")
  const [activeService, setActiveService] = useState<"shoot" | "strategy" | null>(null)
  const [activeTab, setActiveTab] = useState<string>("reel-creator")

  const [serviceForm, setServiceForm] = useState({
    location: "",
    time: "",
    phone: "",
    description: "",
    budget: "",
  })

  // Inventory Products
  const [inventoryProducts, setInventoryProducts] = useState<any[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false)

  // TAB 1: Reel Creator Form States
  const [businessName, setBusinessName] = useState("")
  const [businessType, setBusinessType] = useState("")
  const [productOrOffer, setProductOrOffer] = useState("")
  const [trendingFormat, setTrendingFormat] = useState(TRENDING_REEL_FORMATS[0].name)
  const [occasion, setOccasion] = useState(INDIAN_CONTENT_OCCASIONS[0].name)
  const [tone, setTone] = useState("funny")
  const [language, setLanguage] = useState("hinglish")

  // TAB 1: Generation state & Result
  const [isGeneratingReel, setIsGeneratingReel] = useState(false)
  const [generatedReel, setGeneratedReel] = useState<any | null>(null)
  const [isShootingGuideOpen, setIsShootingGuideOpen] = useState(false)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)

  // TAB 1: Subtitle Player states
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0)
  const [activeSceneIndex, setActiveSceneIndex] = useState(-1)
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // TAB 1: ZSky AI preview state
  const [isGeneratingZSky, setIsGeneratingZSky] = useState(false)
  const [zskyStep, setZskyStep] = useState("")
  const [zskyPreviewUrl, setZskyPreviewUrl] = useState<string | null>(null)

  // TAB 2: Trending Now states
  const [isLoadingTrends, setIsLoadingTrends] = useState(false)
  const [isRefreshingTrends, setIsRefreshingTrends] = useState(false)
  const [trendData, setTrendData] = useState<any | null>(null)

  // TAB 3: Content Calendar States
  const [calendarProducts, setCalendarProducts] = useState<string[]>([])
  const [calendarForm, setCalendarForm] = useState({
    event: "",
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    reelsPerWeek: 3
  })
  const [calendarList, setCalendarList] = useState<CalendarItem[]>([])
  const [isCalendarLoading, setIsCalendarLoading] = useState(false)
  const [calendarStep, setCalendarStep] = useState<number | null>(null)

  // Fetch Inventory and Profile details
  useEffect(() => {
    if (user?.email) setUserEmail(user.email)
  }, [user?.email])

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const { data: { user: currentUser } } = await supabaseRef.current.auth.getUser()
        if (!currentUser) return

        const { data: profile } = await supabaseRef.current
          .from("profiles")
          .select("owner_id, role, company_name")
          .eq("id", currentUser.id)
          .single()

        const ownerId = profile?.role === "owner" ? currentUser.id : profile?.owner_id
        if (!ownerId) return

        if (profile?.company_name) {
          setBusinessName(profile.company_name)
        }

        let query = supabaseRef.current
          .from("products")
          .select("*")
          .eq("owner_id", ownerId)

        if (activeBranchId) {
          query = query.or(`location_id.eq.${activeBranchId},location_id.is.null`)
        }

        const { data: productsData } = await query
        setInventoryProducts(productsData || [])
      } catch (err) {
        console.error("Error loading products:", err)
      }
    }
    fetchInventory()
  }, [activeBranchId])

  // Fetch trends on mount or when Tab 2 is active
  const fetchTrends = async (force = false) => {
    if (force) setIsRefreshingTrends(true)
    else setIsLoadingTrends(true)

    try {
      const res = await fetch(`/api/scrape-trends?force=${force}`)
      if (!res.ok) throw new Error("Failed to fetch trends")
      const data = await res.json()
      setTrendData(data)
    } catch (err) {
      console.error("Error scraping trends:", err)
      toast({
        title: "Trend Scraping Failed",
        description: "Could not fetch latest trends. Using local fallback.",
        variant: "destructive"
      })
    } finally {
      setIsLoadingTrends(false)
      setIsRefreshingTrends(false)
    }
  }

  useEffect(() => {
    fetchTrends()
  }, [])

  // Load Content Calendar from cache
  const loadCalendarCache = async () => {
    setIsCalendarLoading(true)
    try {
      const res = await fetch(`/api/ai/marketing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "calendar" })
      })
      if (!res.ok) throw new Error("Failed to load calendar cache")
      const data = await res.json()
      setCalendarList(data.calendar || [])
    } catch (err) {
      console.error("Error reading calendar cache:", err)
    } finally {
      setIsCalendarLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === "content-calendar" && calendarList.length === 0) {
      loadCalendarCache()
    }
  }, [activeTab])

  // TAB 1: Handle Reel Script Generation
  const handleGenerateReel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productOrOffer) {
      toast({
        title: "Missing fields",
        description: "Please specify what you want to promote.",
        variant: "destructive"
      })
      return
    }

    setIsGeneratingReel(true)
    setGeneratedReel(null)
    setZskyPreviewUrl(null)
    setIsPlaying(false)
    setCurrentPlaybackTime(0)
    setActiveSceneIndex(-1)

    try {
      const res = await fetch("/api/ai/generate-reel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName || "My Startup",
          business_type: businessType || "Retail",
          product_or_offer: productOrOffer,
          trending_format: trendingFormat,
          occasion: occasion,
          language: language,
          tone: tone
        })
      })

      if (!res.ok) {
        throw new Error("Failed to generate script")
      }

      const data = await res.json()
      setGeneratedReel(data)
      toast({
        title: "Reel Skit Generated!",
        description: "Your viral script and editing guides are ready.",
      })
    } catch (err: any) {
      console.error(err)
      toast({
        title: "Generation Failed",
        description: err.message || "Failed to generate reel script.",
        variant: "destructive"
      })
    } finally {
      setIsGeneratingReel(false)
    }
  }

  // Subtitle synchronization logic
  useEffect(() => {
    if (isPlaying && generatedReel?.skit?.scenes) {
      const scenes = generatedReel.skit.scenes
      const totalDur = scenes.reduce((acc: number, s: any) => acc + (s.duration_seconds || 4), 0)

      playbackIntervalRef.current = setInterval(() => {
        setCurrentPlaybackTime(prev => {
          const nextTime = prev + 0.1
          if (nextTime >= totalDur) {
            setIsPlaying(false)
            if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current)
            return 0
          }

          // Determine active scene based on cumulative time
          let cumulativeTime = 0
          let foundIndex = 0
          for (let i = 0; i < scenes.length; i++) {
            cumulativeTime += (scenes[i].duration_seconds || 4)
            if (nextTime <= cumulativeTime) {
              foundIndex = i
              break
            }
          }
          setActiveSceneIndex(foundIndex)

          return nextTime
        })
      }, 100)
    } else {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current)
      }
    }

    return () => {
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current)
    }
  }, [isPlaying, generatedReel])

  // Play/Pause subtitle preview
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  // Simulate ZSky AI video generation
  const handleZSkyGenerate = async () => {
    if (!generatedReel?.zsky_video_prompt) return

    setIsGeneratingZSky(true)
    setZskyStep("Initializing ZSky AI Core...")

    const steps = [
      "Analyzing scene layout and camera angles...",
      "Synthesizing text-to-video descriptors...",
      "Generating keyframes (3D motion)...",
      "Rendering final 9:16 vertical preview..."
    ]

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1200))
      setZskyStep(steps[i])
    }

    // Finished
    setIsGeneratingZSky(false)
    setZskyPreviewUrl("https://assets.mixkit.co/videos/preview/mixkit-small-flowering-plants-in-a-pot-42354-large.mp4")
    toast({
      title: "AI Preview Ready!",
      description: "Mock video generation complete.",
    })
  }

  // Export Script as .txt for CapCut
  const handleDownloadCapCutTxt = () => {
    if (!generatedReel) return
    const content = generatedReel.capcut_export || JSON.stringify(generatedReel, null, 2)
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${generatedReel.skit?.title || "Reel"}_capcut.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Service requests submit
  const submitService = async () => {
    try {
      const res = await fetch("/api/service-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: activeService!,
          userEmail,
          phone: serviceForm.phone,
          location: serviceForm.location,
          time: serviceForm.time,
          budget: serviceForm.budget,
          description: serviceForm.description,
        }),
      })
      if (!res.ok) throw new Error("Mail failed")
      toast({
        title: "Request Sent",
        description: "Our agency team will contact you shortly!",
      })
      setActiveService(null)
    } catch (err: any) {
      toast({
        title: "Submission Failed",
        description: err.message || "Failed to send request",
        variant: "destructive"
      })
    }
  }

  const handleServiceChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setServiceForm({ ...serviceForm, [e.target.name]: e.target.value })
  }

  // TAB 3: Generate 30-Day Content Calendar
  const handleGenerateCalendar = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCalendarLoading(true)
    setCalendarList([])

    // Steps progression
    setCalendarStep(1)
    const t1 = setTimeout(() => setCalendarStep(2), 1000)
    const t2 = setTimeout(() => setCalendarStep(3), 2200)
    const t3 = setTimeout(() => setCalendarStep(4), 3500)

    try {
      const res = await fetch("/api/ai/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "calendar",
          business_name: businessName || "My Startup",
          business_type: businessType || "Retail",
          top_products: calendarProducts.join(", "),
          force: true
        })
      })

      if (!res.ok) throw new Error("Failed to generate calendar")
      const data = await res.json()
      setCalendarList(data.calendar || [])
      toast({
        title: "Content Calendar Ready!",
        description: "30-day posting strategy is successfully configured.",
      })
    } catch (err: any) {
      console.error(err)
      toast({
        title: "Calendar Failure",
        description: err.message || "Could not generate content calendar.",
        variant: "destructive"
      })
    } finally {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      setCalendarStep(null)
      setIsCalendarLoading(false)
    }
  }

  const handleUpdateCalendarItem = (updatedItem: CalendarItem) => {
    setCalendarList(prev => prev.map(item => item.date === updatedItem.date ? updatedItem : item))
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 font-['DM_Sans']">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white flex items-center gap-3 font-['Unbounded'] tracking-tight">
            <Sparkles className="text-cyan-400 size-8 animate-pulse" /> Viral AI Marketing Suite
          </h1>
          <p className="text-slate-400 text-sm md:text-base">
            Craft high-converting skits, discover real-time trends, and map out structured social roadmaps.
          </p>
        </div>
      </div>

      {/* AMBIENT AGENCY PROMOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          onClick={() => setActiveService("shoot")}
          className={`cursor-pointer transition-all duration-300 p-6 rounded-2xl border-2 hover:scale-[1.01] active:scale-[0.99] flex items-center gap-4 ${
            activeService === "shoot"
              ? "bg-purple-950/40 border-purple-500 shadow-purple-500/20 shadow-xl"
              : "bg-[#0b0b0e] border-[#16161a] hover:border-purple-500/30"
          }`}
        >
          <div className="bg-purple-500/10 p-3 rounded-xl border border-purple-500/20">
            <Camera className="text-purple-400 size-6" />
          </div>
          <div>
            <h3 className="text-lg text-white font-bold">Request Professional Shoot</h3>
            <p className="text-xs text-slate-400">Get custom styled video assets filmed in your city.</p>
          </div>
        </div>

        <div
          onClick={() => setActiveService("strategy")}
          className={`cursor-pointer transition-all duration-300 p-6 rounded-2xl border-2 hover:scale-[1.01] active:scale-[0.99] flex items-center gap-4 ${
            activeService === "strategy"
              ? "bg-cyan-950/40 border-cyan-500 shadow-cyan-500/20 shadow-xl"
              : "bg-[#0b0b0e] border-[#16161a] hover:border-cyan-500/30"
          }`}
        >
          <div className="bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/20">
            <Zap className="text-cyan-400 size-6" />
          </div>
          <div>
            <h3 className="text-lg text-white font-bold">Custom Marketing Retainer</h3>
            <p className="text-xs text-slate-400">Collaborate with expert strategists to scale organic reach.</p>
          </div>
        </div>
      </div>

      {/* SERVICE REQUEST modal */}
      {activeService && (
        <Card className="bg-[#0b0b0e] border-[#1e1e24] shadow-2xl relative animate-in fade-in duration-300">
          <button
            onClick={() => setActiveService(null)}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
          >
            <X className="size-5" />
          </button>
          <CardHeader>
            <CardTitle className="text-xl text-white font-['Unbounded']">
              {activeService === "shoot" ? "Reel Production Booking" : "Strategy Retainer Request"}
            </CardTitle>
            <CardDescription className="text-slate-400">
              Provide your details and we will reach out with pricing and availability.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Email Address</Label>
                <Input value={userEmail} disabled className="bg-[#121115] border-slate-800 text-slate-400" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Mobile Number</Label>
                <Input
                  name="phone"
                  placeholder="+91 99999 88888"
                  onChange={handleServiceChange}
                  className="bg-[#121115] border-slate-800 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Your Location</Label>
                <Input
                  name="location"
                  placeholder="e.g. Bangalore, Karnataka"
                  onChange={handleServiceChange}
                  className="bg-[#121115] border-slate-800 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Preferred Timeline</Label>
                <Input
                  name="time"
                  placeholder="e.g. Next Month"
                  onChange={handleServiceChange}
                  className="bg-[#121115] border-slate-800 text-white"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Brief Description / Product Type</Label>
              <Textarea
                name="description"
                placeholder="Brief details about your business and goals..."
                onChange={handleServiceChange}
                className="bg-[#121115] border-slate-800 text-white min-h-[80px]"
              />
            </div>
            <Button onClick={submitService} className="w-full bg-cyan-600 hover:bg-cyan-700 font-bold">
              Submit Request
            </Button>
          </CardContent>
        </Card>
      )}

      {/* THREE TABS LAYOUT */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-[#0b0b0e] border border-slate-800 p-1 w-full max-w-md grid grid-cols-3 rounded-xl">
          <TabsTrigger value="reel-creator" className="font-bold text-xs py-2 rounded-lg">
            🎬 Reel Creator
          </TabsTrigger>
          <TabsTrigger value="trending" className="font-bold text-xs py-2 rounded-lg">
            🔥 Trending Now
          </TabsTrigger>
          <TabsTrigger value="content-calendar" className="font-bold text-xs py-2 rounded-lg">
            📅 Calendar
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: REEL CREATOR */}
        <TabsContent value="reel-creator" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Form Column */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="bg-[#0b0b0e] border-slate-850 p-6 rounded-2xl shadow-xl">
                <CardHeader className="p-0 mb-4">
                  <CardTitle className="text-lg font-bold text-white font-['Unbounded']">Configure Your Script</CardTitle>
                  <CardDescription className="text-xs text-slate-400">Setup business context to build a viral short-form skit.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 space-y-4">
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">Business Name</Label>
                      <Input
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. Chai Point"
                        className="bg-slate-900 border-slate-800 text-xs h-9 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">Business Type</Label>
                      <Input
                        value={businessType}
                        onChange={(e) => setBusinessType(e.target.value)}
                        placeholder="e.g. Café"
                        className="bg-slate-900 border-slate-800 text-xs h-9 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-300">What to Promote / Product / Offer</Label>
                    <Textarea
                      value={productOrOffer}
                      onChange={(e) => setProductOrOffer(e.target.value)}
                      placeholder="e.g. Buy 1 Get 1 Free on Elaichi Tea this Saturday!"
                      className="bg-slate-900 border-slate-800 text-xs text-white min-h-[60px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">Trending Format</Label>
                      <select
                        value={trendingFormat}
                        onChange={(e) => setTrendingFormat(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 h-9"
                      >
                        {TRENDING_REEL_FORMATS.map(f => (
                          <option key={f.id} value={f.name}>{f.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">Occasion / Holiday</Label>
                      <select
                        value={occasion}
                        onChange={(e) => setOccasion(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 h-9"
                      >
                        {INDIAN_CONTENT_OCCASIONS.map(o => (
                          <option key={o.name} value={o.name}>{o.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">Language Style</Label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 h-9"
                      >
                        <option value="hinglish">Hinglish (Standard)</option>
                        <option value="hindi">Hindi</option>
                        <option value="english">Conversational English</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-300">Tone</Label>
                      <select
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 h-9"
                      >
                        <option value="funny">Funny</option>
                        <option value="emotional">Emotional</option>
                        <option value="dramatic">Dramatic</option>
                        <option value="motivational">Motivational</option>
                      </select>
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerateReel}
                    disabled={isGeneratingReel || !productOrOffer}
                    className="w-full h-11 bg-gradient-to-r from-cyan-500 to-blue-500 text-xs font-bold text-white rounded-xl shadow-lg shadow-cyan-500/10 hover:scale-[1.01] transition-transform"
                  >
                    {isGeneratingReel ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Generating Skit...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 size-4" />
                        Assemble Script
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Preview & Script Column */}
            <div className="lg:col-span-7 space-y-6">
              {isGeneratingReel && (
                <div className="bg-[#0b0b0e] border border-cyan-500/20 rounded-2xl p-12 flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                  <h4 className="text-white font-bold text-sm">Structuring Script Dialogue...</h4>
                  <p className="text-xs text-slate-500 max-w-xs text-center">Applying viral tone filters and synchronizing timings for Hinglish...</p>
                </div>
              )}

              {generatedReel && !isGeneratingReel && (
                <div className="space-y-6">
                  
                  {/* Top Bar Actions */}
                  <div className="bg-[#0b0b0e] border border-slate-900 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">{generatedReel.skit?.title || "Reel Script"}</h4>
                      <p className="text-[10px] text-slate-500">Duration: {generatedReel.skit?.duration_estimate || "30s"}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          const fullScript = generatedReel.skit?.scenes?.map((s: any) => `[${s.character}]: ${s.dialogue} (${s.action})`).join("\n")
                          navigator.clipboard.writeText(fullScript)
                          toast({ title: "Copied!", description: "Dialogue copied to clipboard." })
                        }}
                        variant="outline"
                        size="xs"
                        className="border-slate-800 text-[10px] h-8 hover:bg-slate-900"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1" /> Copy Dialogue
                      </Button>
                      <Button
                        onClick={handleDownloadCapCutTxt}
                        variant="outline"
                        size="xs"
                        className="border-slate-800 text-[10px] h-8 hover:bg-slate-900 text-cyan-400"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" /> CapCut Txt
                      </Button>
                    </div>
                  </div>

                  {/* Synchronized Subtitle Player (Interactive Preview) */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-5 flex justify-center">
                      <div className="relative w-full max-w-[240px] aspect-[9/16] bg-slate-950 rounded-3xl border-4 border-slate-800 overflow-hidden shadow-2xl flex flex-col justify-between p-4">
                        {/* Status bar */}
                        <div className="flex justify-between items-center text-[10px] text-slate-500 z-10">
                          <span>{generatedReel.skit?.title ? generatedReel.skit.title.slice(0, 15) + "..." : "Reel Preview"}</span>
                          <span className="font-mono bg-black/40 px-1 py-0.5 rounded">
                            {currentPlaybackTime.toFixed(1)}s
                          </span>
                        </div>

                        {/* Middle Visual Mockup */}
                        <div className="absolute inset-0 z-0 flex items-center justify-center">
                          {zskyPreviewUrl ? (
                            <video
                              src={zskyPreviewUrl}
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="w-full h-full object-cover opacity-75"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-tr from-cyan-950/20 via-[#0e0c12] to-purple-950/20 animate-pulse flex flex-col items-center justify-center p-4">
                              <Clapperboard className="w-10 h-10 text-cyan-500/20 mb-2" />
                              <span className="text-[10px] text-slate-600 text-center uppercase tracking-wider">
                                {isPlaying ? "Playing scene track" : "Player Paused"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Active Scene Overlay (Subtitles) */}
                        <div className="z-10 bg-black/75 border border-white/5 backdrop-blur-md p-3 rounded-2xl space-y-1.5 mb-6 text-center max-w-[90%] mx-auto">
                          {activeSceneIndex !== -1 && generatedReel.skit?.scenes?.[activeSceneIndex] ? (
                            <>
                              <span className="text-[8px] bg-cyan-600 text-white font-bold px-1.5 py-0.5 rounded-full uppercase">
                                {generatedReel.skit.scenes[activeSceneIndex].character}
                              </span>
                              <p className="text-xs text-white font-bold leading-snug">
                                "{generatedReel.skit.scenes[activeSceneIndex].dialogue}"
                              </p>
                              <p className="text-[9px] text-amber-400 italic">
                                Action: {generatedReel.skit.scenes[activeSceneIndex].action}
                              </p>
                              {generatedReel.skit.scenes[activeSceneIndex].text_overlay && (
                                <div className="mt-1 text-[9px] bg-red-600 text-white font-black py-0.5 px-1 rounded inline-block">
                                  Overlay: {generatedReel.skit.scenes[activeSceneIndex].text_overlay}
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-slate-400 italic">
                              Click Play to start simulated subtitles.
                            </p>
                          )}
                        </div>

                        {/* Playback Controls */}
                        <div className="z-10 flex justify-center mt-auto">
                          <button
                            onClick={handlePlayPause}
                            className="w-10 h-10 rounded-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 flex items-center justify-center shadow-lg transition-transform active:scale-90"
                          >
                            {isPlaying ? <Pause className="w-5 h-5 fill-slate-950" /> : <Play className="w-5 h-5 fill-slate-950 ml-0.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-7 space-y-4">
                      {/* ZSky generator block */}
                      <Card className="bg-slate-950 border border-slate-900 p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Radio className="w-3.5 h-3.5 text-cyan-400" /> ZSky AI Video Preview
                          </span>
                          <span className="text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-bold">
                            Preview Engine
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                          Automatically generate visual preview content using ZSky AI model.
                        </p>
                        
                        {isGeneratingZSky ? (
                          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3">
                            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                            <span className="text-xs text-slate-300 font-medium animate-pulse">{zskyStep}</span>
                          </div>
                        ) : zskyPreviewUrl ? (
                          <div className="space-y-2">
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                              <Check className="w-4 h-4" /> Custom AI preview successfully generated.
                            </div>
                            <Button
                              onClick={handleZSkyGenerate}
                              variant="outline"
                              size="xs"
                              className="w-full text-[10px] border-slate-800 text-slate-300 h-8"
                            >
                              Regenerate AI Preview
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={handleZSkyGenerate}
                            className="w-full h-9 bg-cyan-600 hover:bg-cyan-700 text-xs font-bold text-white rounded-xl"
                          >
                            Generate AI Video Preview
                          </Button>
                        )}
                      </Card>

                      {/* Characters list */}
                      <div className="bg-[#111116] border border-[#22222a] p-4 rounded-xl">
                        <span className="text-[10px] text-slate-500 uppercase font-black block mb-2">Cast & Characters</span>
                        <div className="flex flex-wrap gap-2">
                          {(generatedReel.skit?.characters || []).map((char: string, i: number) => (
                            <span key={i} className="text-xs bg-slate-900 border border-slate-800 text-white px-3 py-1 rounded-full font-bold">
                              👤 {char}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Shoot & Editing Guide */}
                  <Card className="bg-[#0b0b0e] border border-slate-900 p-6 rounded-2xl">
                    <h5 className="text-sm font-bold text-white font-['Unbounded'] mb-4 flex items-center gap-2">
                      <Clapperboard className="w-4 h-4 text-cyan-400" /> Production & Shooting Guide
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300">
                      <div className="space-y-3">
                        <div>
                          <span className="text-slate-500 font-bold uppercase block mb-1">Location Vibe</span>
                          <p className="text-white leading-relaxed">{generatedReel.shooting_guide?.location}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold uppercase block mb-1">Props Required</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {(generatedReel.shooting_guide?.props_needed || []).map((p: string, i: number) => (
                              <span key={i} className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-white">{p}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold uppercase block mb-1">Lighting Tip</span>
                          <p className="text-white leading-relaxed">{generatedReel.shooting_guide?.lighting_tip}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <span className="text-slate-500 font-bold uppercase block mb-1">Outfit Recommendation</span>
                          <p className="text-white leading-relaxed">{generatedReel.shooting_guide?.outfit_suggestion}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold uppercase block mb-1">Estimated Prep & Shoot Time</span>
                          <p className="text-white leading-relaxed">{generatedReel.shooting_guide?.total_shoot_time_estimate}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold uppercase block mb-1">Editing Tip</span>
                          <p className="text-white leading-relaxed">{generatedReel.shooting_guide?.editing_tip}</p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Dialogue Track Detail list */}
                  <Card className="bg-[#0b0b0e] border border-slate-900 p-6 rounded-2xl">
                    <h5 className="text-sm font-bold text-white font-['Unbounded'] mb-4 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-cyan-400" /> Detailed Dialogues & Camera Angles
                    </h5>
                    <div className="space-y-4">
                      {(generatedReel.skit?.scenes || []).map((scene: any, i: number) => (
                        <div key={i} className={`p-4 rounded-xl border transition-colors ${i === activeSceneIndex ? 'border-cyan-500/50 bg-cyan-950/10' : 'border-slate-900 bg-slate-950/40'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-white">Scene #{scene.scene_number} ({scene.duration_seconds}s)</span>
                            <span className="text-[9px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400">{scene.camera_angle}</span>
                          </div>
                          <p className="text-xs text-slate-400 mb-1"><span className="text-slate-500 font-bold">Action:</span> {scene.action}</p>
                          <p className="text-sm text-white font-medium leading-relaxed">
                            <span className="text-cyan-400 font-bold mr-1.5">[{scene.character}]:</span>
                            "{scene.dialogue}"
                          </p>
                          {scene.text_overlay && (
                            <p className="text-[10px] text-red-400 mt-2 font-mono"><span className="text-slate-500 font-bold">Overlay:</span> "{scene.text_overlay}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Copywriting Caption / Hashtags */}
                  <Card className="bg-[#0b0b0e] border border-slate-900 p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-900 pb-3">
                      <h5 className="text-sm font-bold text-white font-['Unbounded']">Caption & Hashtags</h5>
                      <Button
                        onClick={() => {
                          const cap = generatedReel.caption?.full_caption || generatedReel.caption?.body
                          navigator.clipboard.writeText(cap)
                          toast({ title: "Copied!", description: "Caption & hashtags ready to post." })
                        }}
                        variant="outline"
                        size="xs"
                        className="border-slate-850 h-8 text-[10px]"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1" /> Copy Caption
                      </Button>
                    </div>
                    <div className="space-y-4 text-xs">
                      <div>
                        <span className="text-slate-500 font-bold block mb-1">Caption Hook</span>
                        <p className="text-white font-bold font-['DM_Sans']">"{generatedReel.caption?.hook_line}"</p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block mb-1">Body Text</span>
                        <p className="text-slate-300 leading-relaxed font-['DM_Sans'] whitespace-pre-wrap">{generatedReel.caption?.body}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block mb-1">Call To Action</span>
                        <p className="text-amber-400 font-bold">"{generatedReel.caption?.cta}"</p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block mb-1">Recommended Hashtags</span>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {(generatedReel.hashtags?.all || []).map((h: string, idx: number) => (
                            <span key={idx} className="bg-slate-900 border border-slate-800 text-[#0fd49a] px-2 py-0.5 rounded">{h}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>

                </div>
              )}

              {!generatedReel && !isGeneratingReel && (
                <div className="h-full min-h-[300px] border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center p-8 text-center bg-[#0b0b0e]/30">
                  <Clapperboard className="w-12 h-12 text-slate-600 mb-3" />
                  <h4 className="text-white font-bold text-sm mb-1">No Script Assembled Yet</h4>
                  <p className="text-xs text-slate-500 max-w-xs leading-relaxed">Fill in details in the script config form and click assemble script to run.</p>
                </div>
              )}
            </div>

          </div>
        </TabsContent>

        {/* TAB 2: TRENDING NOW */}
        <TabsContent value="trending" className="space-y-6">
          {trendData && (
            <TrendBanner
              topTrend={trendData.top_trend_today}
              weeklyTheme={trendData.weekly_theme}
              bestPostingTime={trendData.best_posting_time}
              sources={trendData.sources}
              generatedAt={trendData.generated_at}
            />
          )}

          <TrendResearch
            isLoading={isLoadingTrends}
            trendData={trendData}
            isRefreshing={isRefreshingTrends}
            onRefresh={() => fetchTrends(true)}
            onUseIdea={(ideaText, hashtags) => {
              setProductOrOffer(ideaText)
              // Auto fill trending format if possible
              toast({
                title: "Idea Applied!",
                description: "Product context and hashtags auto-filled. Redirecting to Creator.",
              })
              setActiveTab("reel-creator")
            }}
          />
        </TabsContent>

        {/* TAB 3: CALENDAR */}
        <TabsContent value="content-calendar" className="space-y-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-white font-['Unbounded']">30-Day Content Roadmap</h2>
            <p className="text-xs text-slate-400">Generate a structured multi-platform campaign calendar trigger-mapped for Indian SMBs.</p>
          </div>

          {!isCalendarLoading && calendarList.length === 0 && (
            <Card className="border-slate-850 bg-[#0b0b0e] p-6 rounded-2xl">
              <CardContent className="p-0 space-y-4">
                
                {/* Products Multiselect */}
                <div className="space-y-2 relative">
                  <Label className="text-xs text-slate-300">
                    Select Products to Include in Calendar Focus
                  </Label>
                  
                  <div 
                    onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white flex items-center justify-between cursor-pointer text-xs h-10"
                  >
                    <span className="truncate">
                      {calendarProducts.length === 0 
                        ? "Select products..." 
                        : `${calendarProducts.length} product(s) selected`
                      }
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>

                  {isProductDropdownOpen && (
                    <div className="absolute z-20 left-0 right-0 mt-2 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-3 max-h-[200px] overflow-y-auto space-y-2">
                      <div className="relative mb-2">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <Input 
                          placeholder="Search..." 
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="pl-8 bg-slate-900 border-slate-800 text-white text-xs h-8"
                        />
                      </div>

                      {inventoryProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 ? (
                        <p className="text-[10px] text-slate-500 text-center py-2">No products found</p>
                      ) : (
                        inventoryProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => {
                          const isSelected = calendarProducts.includes(p.name)
                          return (
                            <div 
                              key={p.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (isSelected) {
                                  setCalendarProducts(calendarProducts.filter(x => x !== p.name))
                                } else {
                                  setCalendarProducts([...calendarProducts, p.name])
                                }
                              }}
                              className={`flex items-center justify-between p-2 rounded-lg hover:bg-slate-900 cursor-pointer border text-xs ${
                                isSelected ? "bg-cyan-600/10 border-cyan-500/30 text-white" : "border-transparent text-slate-400"
                              }`}
                            >
                              <span>{p.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Campaign objective theme */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">Campaign / Marketing Objective Focus</Label>
                  <Textarea
                    placeholder="e.g. Clearance sale, brand awareness, new product promotion..."
                    value={calendarForm.event}
                    onChange={(e) => setCalendarForm({ ...calendarForm, event: e.target.value })}
                    className="bg-slate-900 border-slate-800 text-xs text-white min-h-[60px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-300">Target Month</Label>
                    <select
                      value={calendarForm.month}
                      onChange={(e) => setCalendarForm({ ...calendarForm, month: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 h-9"
                    >
                      {[0, 1, 2].map(i => {
                        const d = new Date()
                        d.setMonth(d.getMonth() + i)
                        const val = d.toISOString().slice(0, 7)
                        const label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
                        return <option key={val} value={val}>{label}</option>
                      })}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-300">Reels Target Per Week</Label>
                    <select
                      value={calendarForm.reelsPerWeek}
                      onChange={(e) => setCalendarForm({ ...calendarForm, reelsPerWeek: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 h-9"
                    >
                      {[1, 2, 3, 4, 5, 6, 7].map(n => (
                        <option key={n} value={n}>{n} reel(s) / week</option>
                      ))}
                    </select>
                  </div>
                </div>

                <Button
                  onClick={handleGenerateCalendar}
                  disabled={isCalendarLoading || calendarProducts.length === 0 || !calendarForm.event}
                  className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-xs font-bold text-white rounded-xl shadow-lg hover:scale-[1.01] transition-transform"
                >
                  Generate My Content Calendar
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step Loader UI */}
          {isCalendarLoading && (
            <div className="w-full bg-[#0b0b0e] border border-amber-500/20 rounded-3xl p-8 flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-4" />
              <h3 className="text-base font-bold text-white font-['Unbounded'] mb-2">Assembling Roadmap Plan</h3>
              
              <div className="w-full max-w-xs space-y-2">
                {[
                  { num: 1, label: "Analyzing Indian festival calendars..." },
                  { num: 2, label: "Crawling live YouTube video feeds..." },
                  { num: 3, label: "Aggregating active Instagram memes..." },
                  { num: 4, label: "Generating 30-day posting roadmap..." }].map(step => {
                  const isActive = calendarStep === step.num
                  const isDone = calendarStep !== null && calendarStep > step.num
                  return (
                    <div key={step.num} className="flex items-center gap-3 text-xs">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isDone 
                          ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                          : isActive 
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse" 
                          : "bg-slate-900 text-slate-600 border border-slate-800"
                      }`}>
                        {isDone ? "✓" : step.num}
                      </div>
                      <span className={`${isActive ? "text-white font-bold" : isDone ? "text-slate-400" : "text-slate-500"}`}>
                        {step.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Output Display */}
          {calendarList.length > 0 && !isCalendarLoading && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <Button 
                  variant="outline"
                  onClick={() => { setCalendarList([]); setCalendarProducts([]); setCalendarForm({ ...calendarForm, event: "" }); }}
                  className="border-slate-800 hover:bg-slate-900 text-white rounded-xl h-9 text-xs"
                >
                  Start New Calendar
                </Button>
              </div>

              <ContentCalendar
                calendar={calendarList}
                isLoading={false}
                onUpdateCalendarItem={handleUpdateCalendarItem}
                eventDescription={calendarForm.event}
                onGenerateScript={(topic, details, format) => {
                  setProductOrOffer(`${topic} — ${details}`)
                  if (format) setTrendingFormat(format)
                  setActiveTab("reel-creator")
                  toast({
                    title: "🎬 Script Context Loaded",
                    description: "Calendar idea pre-filled. Adjust and click Assemble Script!",
                  })
                }}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>

    </div>
  )
}
