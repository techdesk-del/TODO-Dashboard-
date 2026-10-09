import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { parseSpeechOrTextCommand } from '@/lib/aiParser';
import { soundEngine } from '@/lib/sound';
import { Mic, ArrowRight, X, Check } from 'lucide-react';
import { isCeoUser } from '@/lib/rosterData';

export const VoiceInputBar: React.FC = () => {
  const { addTask, members, currentUser } = useApp();
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API if supported
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.continuous = false;
          rec.interimResults = true;
          rec.lang = 'en-US';

          rec.onresult = (event: any) => {
            const transcript = Array.from(event.results)
              .map((result: any) => result[0].transcript)
              .join('');
            setCurrentTranscription(transcript);
          };

          rec.onerror = () => {
            // Speech error handling
          };

          rec.onend = () => {
            setIsListening(false);
          };

          recognitionRef.current = rec;
        } catch (e) {
          console.log('Web Speech init skipped');
        }
      }
    }
  }, []);

  const triggerVoiceCapture = () => {
    setIsListening(true);
    setShowStreamModal(true);
    setCurrentTranscription('');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {}
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const rawText = inputText.trim();
    setInputText('');

    // Play enterprise acoustic chime
    soundEngine.playSuccessChime();

    // Parse immediately with deterministic entity extractor
    const parsed = parseSpeechOrTextCommand(rawText, currentUser);
    const isCeo = isCeoUser(currentUser);
    const explicitlyMatched = (isCeo && parsed.assigneeName)
      ? members.find(m => m.name.toLowerCase().includes(parsed.assigneeName.toLowerCase()))
      : null;
    const targetMember = explicitlyMatched || currentUser;

    addTask({
      title: parsed.title,
      scheduledDate: parsed.scheduledDate,
      time: parsed.time,
      priority: parsed.priority,
      status: 'In Progress',
      progressPercent: 50,
      isJustAdded: true,
      department: targetMember.department,
      assignees: [
        {
          id: targetMember.id,
          name: targetMember.name,
          email: targetMember.email,
          department: targetMember.department,
          designation: targetMember.designation,
          avatar: targetMember.avatar,
          status: 'In Progress'
        }
      ],
      aiMetadata: {
        rawTranscript: rawText,
        extractionLatencyMs: parsed.latencyMs,
        source: 'text_nlp',
        confidenceScore: parsed.confidence
      }
    });
  };

  const handleConfirmAndSave = () => {
    const rawText = currentTranscription.trim() || 'New Voice Deliverable';

    // Play pleasant enterprise acoustic chime
    soundEngine.playSuccessChime();

    const parsed = parseSpeechOrTextCommand(rawText, currentUser);
    const isCeo = isCeoUser(currentUser);
    const explicitlyMatched = (isCeo && parsed.assigneeName)
      ? members.find(m => m.name.toLowerCase().includes(parsed.assigneeName.toLowerCase()))
      : null;
    const targetMember = explicitlyMatched || currentUser;

    addTask({
      title: parsed.title,
      scheduledDate: parsed.scheduledDate,
      time: parsed.time,
      priority: parsed.priority,
      status: 'In Progress',
      progressPercent: 50,
      isJustAdded: true,
      department: targetMember.department,
      assignees: [
        {
          id: targetMember.id,
          name: targetMember.name,
          email: targetMember.email,
          department: targetMember.department,
          designation: targetMember.designation,
          avatar: targetMember.avatar,
          status: 'In Progress'
        }
      ],
      aiMetadata: {
        rawTranscript: rawText,
        extractionLatencyMs: parsed.latencyMs,
        source: 'voice_whisper',
        confidenceScore: parsed.confidence
      }
    });

    setShowStreamModal(false);
    setIsListening(false);
    setCurrentTranscription('');
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
  };

  return (
    <>
      <div className="bottom-task-bar">
        {/* Voice Button */}
        <button
          type="button"
          className={`voice-hold-btn ${isListening ? 'recording' : ''}`}
          onClick={triggerVoiceCapture}
          title="Voice task input"
        >
          <Mic size={18} />
          <span>{isListening ? 'Listening...' : 'Voice Input (Click to Speak)'}</span>
        </button>

        {/* Text Input Bar with submit */}
        <form className="text-composer-form" onSubmit={handleTextSubmit}>
          <input
            type="text"
            className="composer-input"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Type your task here (e.g. Schedule team meeting tomorrow at 3pm)..."
          />
          <button type="submit" className="composer-send-btn" title="Submit task command">
            <ArrowRight size={18} />
          </button>
        </form>
      </div>

      {/* Voice Assistant Modal: Clean, direct voice recording */}
      {showStreamModal && (
        <div className="stream-overlay" onClick={() => setShowStreamModal(false)}>
          <div className="stream-modal-card" style={{ maxWidth: '460px' }} onClick={e => e.stopPropagation()}>
            <div className="stream-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: isListening ? '#fee2e2' : '#eff6ff',
                  color: isListening ? '#dc2626' : '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Mic size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    {isListening ? 'Listening to voice...' : 'Voice Task Input'}
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Speak your task clearly into the microphone
                  </span>
                </div>
              </div>

              <button className="calendar-nav-btn" onClick={() => setShowStreamModal(false)} aria-label="Close dialog">
                <X size={16} />
              </button>
            </div>

            {/* Audio Waveform Animation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '0.8rem 0' }}>
              <div className="stream-audio-wave">
                <span className="sound-bar" />
                <span className="sound-bar" />
                <span className="sound-bar" />
                <span className="sound-bar" />
                <span className="sound-bar" />
              </div>
              <span style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 600 }}>
                {isListening ? 'Recording active — Speak now' : 'Microphone Ready'}
              </span>
            </div>

            {/* Live Transcription Bubble */}
            <div className="transcription-bubble" style={{ minHeight: '80px', display: 'flex', alignItems: 'center' }}>
              {currentTranscription ? (
                <span>&ldquo;{currentTranscription}&rdquo;</span>
              ) : (
                <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 400 }}>
                  Listening for your speech... Speak your task now (e.g. Schedule meeting tomorrow at 4 PM).
                </span>
              )}
            </div>

            {/* Clean Modal Actions Footer */}
            <div className="stream-modal-footer">
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowStreamModal(false);
                    setIsListening(false);
                    if (recognitionRef.current) {
                      try { recognitionRef.current.stop(); } catch (e) {}
                    }
                  }}
                  style={{ flex: '0 0 auto', minWidth: '80px', justifyContent: 'center' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleConfirmAndSave}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <Check size={15} />
                  <span>Save Task</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
