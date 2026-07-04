'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'

type VoiceLanguage = 'hi-IN' | 'mr-IN' | 'gu-IN' | 'en-IN'

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void
  defaultLanguage?: VoiceLanguage
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const LANGUAGES: { label: string; value: VoiceLanguage }[] = [
  { label: '🇮🇳 Hindi', value: 'hi-IN' },
  { label: 'मराठी', value: 'mr-IN' },
  { label: 'ગુજ', value: 'gu-IN' },
  { label: 'English', value: 'en-IN' },
]

type VoiceState = 'idle' | 'listening' | 'processing' | 'done' | 'error'

export function VoiceInputButton({
  onTranscript,
  defaultLanguage = 'en-IN',
  disabled = false,
  size = 'md',
}: VoiceInputButtonProps) {
  const [state, setState] = useState<VoiceState>('idle')
  const [language, setLanguage] = useState<VoiceLanguage>(defaultLanguage)
  const [showLangPicker, setShowLangPicker] = useState(false)
  const recognitionRef = useRef<{ stop: () => void; start: () => void } | null>(null)
  const stateRef = useRef<VoiceState>('idle')

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const needsHttps =
    typeof window !== 'undefined' &&
    !window.isSecureContext &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'

  const startListening = useCallback(() => {
    if (!isSupported || needsHttps) {
      setState('error')
      return
    }

    const Win = window as Window & {
      SpeechRecognition?: typeof SpeechRecognition
      webkitSpeechRecognition?: typeof SpeechRecognition
    }
    const SpeechRecognitionCtor = Win.SpeechRecognition || Win.webkitSpeechRecognition
    if (!SpeechRecognitionCtor) {
      setState('error')
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = language
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setState('listening')

    recognition.onresult = (event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => {
      setState('processing')
      const transcript = event.results[0][0].transcript
      setTimeout(() => {
        onTranscript(transcript)
        setState('done')
        setTimeout(() => setState('idle'), 1500)
      }, 300)
    }

    recognition.onerror = () => {
      setState('error')
      setTimeout(() => setState('idle'), 2000)
    }

    recognition.onend = () => {
      if (stateRef.current === 'listening') setState('idle')
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [language, isSupported, needsHttps, onTranscript])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setState('idle')
  }, [])

  const handleClick = () => {
    if (state === 'listening') {
      stopListening()
    } else if (state === 'idle') {
      startListening()
    }
  }

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16
  const btnSize = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8'

  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        title="Voice input not supported in this browser"
        className={`${btnSize} rounded-full bg-gray-100 text-gray-400 flex items-center justify-center cursor-not-allowed`}
      >
        <MicOff size={iconSize} />
      </button>
    )
  }

  return (
    <div className="relative inline-flex items-center gap-1 flex-wrap">
      {needsHttps && (
        <span className="text-[10px] text-amber-500 max-w-[140px] leading-tight">
          Voice input requires HTTPS
        </span>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowLangPicker(!showLangPicker)}
          className="text-xs text-muted-foreground hover:text-foreground px-1"
          title="Select language"
        >
          {LANGUAGES.find((l) => l.value === language)?.label}
        </button>
        {showLangPicker && (
          <div className="absolute bottom-full left-0 mb-1 bg-popover border rounded-md shadow-md z-50 min-w-[120px]">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                type="button"
                onClick={() => {
                  setLanguage(lang.value)
                  setShowLangPicker(false)
                }}
                className="block w-full text-left px-3 py-1.5 text-sm hover:bg-accent"
              >
                {lang.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || needsHttps || state === 'processing' || state === 'done'}
        title={
          state === 'idle'
            ? 'Click to speak'
            : state === 'listening'
              ? 'Listening... click to stop'
              : state === 'processing'
                ? 'Processing...'
                : state === 'done'
                  ? 'Done!'
                  : 'Voice not supported'
        }
        className={`
          ${btnSize} rounded-full flex items-center justify-center
          transition-all duration-200 border
          ${state === 'idle' ? 'bg-background hover:bg-accent text-muted-foreground border-input' : ''}
          ${state === 'listening' ? 'bg-red-500 text-white border-red-500 animate-pulse' : ''}
          ${state === 'processing' ? 'bg-blue-500 text-white border-blue-500' : ''}
          ${state === 'done' ? 'bg-green-500 text-white border-green-500' : ''}
          ${state === 'error' ? 'bg-orange-500 text-white border-orange-500' : ''}
          ${disabled || needsHttps ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {state === 'processing' ? (
          <Loader2 size={iconSize} className="animate-spin" />
        ) : state === 'done' ? (
          <span className="text-xs">✓</span>
        ) : state === 'listening' ? (
          <MicOff size={iconSize} />
        ) : (
          <Mic size={iconSize} />
        )}
      </button>

      {state === 'listening' && (
        <span className="text-xs text-red-500 animate-pulse">Listening...</span>
      )}
      {state === 'error' && <span className="text-xs text-orange-500">Try again</span>}
    </div>
  )
}
