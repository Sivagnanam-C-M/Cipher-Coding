'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { ShieldAlert, Maximize2, AlertTriangle, XCircle, Award, Clock } from 'lucide-react';
import CyberButton from '@/components/ui/CyberButton';
import Badge from '@/components/ui/Badge';

interface TerminationData {
  totalScore: number;
  solvedCount: number;
  completedAt: string;
}

interface ProctorContextType {
  isFullscreen: boolean;
  requestFullscreen: () => Promise<void>;
  tabSwitchCount: number;
  maxTabSwitches: number;
  remainingSwitches: number;
  isTerminated: boolean;
  terminationData: TerminationData | null;
  active: boolean;
  setSessionState: (status: string, count?: number, max?: number, endReason?: string | null) => void;
}

const ProctorContext = createContext<ProctorContextType | null>(null);

export function useProctoring() {
  const context = useContext(ProctorContext);
  if (!context) {
    throw new Error('useProctoring must be used within a ProctorProvider');
  }
  return context;
}

export function ProctorProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [mounted, setMounted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [sessionStatus, setSessionStatus] = useState<string>('not_attended');
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const [maxTabSwitches, setMaxTabSwitches] = useState<number>(4);
  const [isTerminated, setIsTerminated] = useState<boolean>(false);
  const [terminationData, setTerminationData] = useState<TerminationData | null>(null);

  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [warningCount, setWarningCount] = useState<number>(0);
  const [showTerminatedModal, setShowTerminatedModal] = useState<boolean>(false);
  const [showFullscreenWarningModal, setShowFullscreenWarningModal] = useState<boolean>(false);
  const [fullscreenWarningCount, setFullscreenWarningCount] = useState<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const lastSwitchTimestamp = useRef<number>(0);
  const isSwitchingRef = useRef<boolean>(false);
  const wasFullscreenRef = useRef<boolean>(false);
  const sessionActiveSinceRef = useRef<number>(0);

  // Helper to enter full-page mode
  const requestFullscreen = useCallback(async () => {
    try {
      if (document.documentElement && !document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
          await (document.documentElement as any).webkitRequestFullscreen();
        }
      }
      setIsFullscreen(true);
      wasFullscreenRef.current = true;
    } catch (err) {
      console.warn('[Proctor] Fullscreen request not granted:', err);
    } finally {
      setShowFullscreenWarningModal(false);
    }
  }, []);

  // Update session state from parent/pages
  const setSessionState = useCallback(
    (status: string, count?: number, max?: number, endReason?: string | null) => {
      setSessionStatus((prev) => {
        if (status === 'active' && prev !== 'active') {
          sessionActiveSinceRef.current = Date.now();
        }
        return status;
      });
      if (typeof count === 'number') setTabSwitchCount(count);
      if (typeof max === 'number') setMaxTabSwitches(max);

      if (status === 'completed' && endReason === 'tab_switch_exceeded') {
        setIsTerminated(true);
        setShowTerminatedModal(true);
      } else if (status !== 'completed') {
        setIsTerminated(false);
      }
    },
    []
  );

  // Monitor fullscreen state and detect true exits during active mission
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isFull);

      if (isFull) {
        wasFullscreenRef.current = true;
        setShowFullscreenWarningModal(false);
      } else if (wasFullscreenRef.current && sessionStatus === 'active' && !isTerminated) {
        // Participant was in fullscreen and explicitly exited (e.g. ESC key)
        wasFullscreenRef.current = false;
        setShowFullscreenWarningModal(true);
        setFullscreenWarningCount((prev) => prev + 1);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    // Initial check on mount
    if (typeof document !== 'undefined') {
      const isFull = Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isFull);
      if (isFull) wasFullscreenRef.current = true;
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [sessionStatus, isTerminated]);

  // Record tab switch on server
  const recordTabSwitch = useCallback(async () => {
    if (sessionStatus !== 'active' || isTerminated || isSwitchingRef.current) {
      return;
    }

    const now = Date.now();
    // 3-second startup grace period after session activates to avoid false violations during commencement / fullscreen handshake
    if (sessionActiveSinceRef.current > 0 && now - sessionActiveSinceRef.current < 3000) {
      return;
    }

    // Debounce to avoid multiple triggers on single blur/visibility transition
    if (now - lastSwitchTimestamp.current < 1500) {
      return;
    }
    lastSwitchTimestamp.current = now;
    isSwitchingRef.current = true;

    try {
      const res = await fetch('/api/mission/tab-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ignored) {
          isSwitchingRef.current = false;
          return;
        }

        const newCount = data.tabSwitchCount;
        setTabSwitchCount(newCount);
        if (data.maxTabSwitches) setMaxTabSwitches(data.maxTabSwitches);

        if (data.exceeded || data.isTerminated) {
          setIsTerminated(true);
          setSessionStatus('completed');
          setTerminationData({
            totalScore: data.totalScore ?? 0,
            solvedCount: data.solvedCount ?? 0,
            completedAt: data.completedAt ?? new Date().toISOString(),
          });
          setShowWarningModal(false);
          setShowTerminatedModal(true);
        } else {
          setWarningCount(newCount);
          setShowWarningModal(true);
        }
      }
    } catch (err) {
      console.error('[Proctor] Failed to report tab switch:', err);
    } finally {
      isSwitchingRef.current = false;
    }
  }, [sessionStatus, isTerminated]);

  // Monitor visibility change (Tab Switch / Window Switch)
  useEffect(() => {
    if (sessionStatus !== 'active' || isTerminated) return;

    let isNavigating = false;
    const handleBeforeUnload = () => {
      isNavigating = true;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        recordTabSwitch();
      }
    };

    const handleWindowBlur = () => {
      // Ignore during page unload/navigation or if document still holds internal focus
      if (isNavigating) return;
      if (typeof document !== 'undefined' && document.hasFocus && document.hasFocus()) {
        return;
      }
      recordTabSwitch();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sessionStatus, isTerminated, recordTabSwitch]);

  const remainingSwitches = Math.max(0, maxTabSwitches - tabSwitchCount);
  const isActiveMission = sessionStatus === 'active';

  return (
    <ProctorContext.Provider
      value={{
        isFullscreen,
        requestFullscreen,
        tabSwitchCount,
        maxTabSwitches,
        remainingSwitches,
        isTerminated,
        terminationData,
        active: isActiveMission,
        setSessionState,
      }}
    >
      {/* Full-Page Mode Reminder Banner (if mission is active but not fullscreen) */}
      {isActiveMission && !isFullscreen && !isTerminated && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-950/95 border-b-2 border-red-500 px-4 py-2.5 backdrop-blur-md shadow-2xl flex flex-wrap items-center justify-between gap-3 font-mono animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center space-x-3 text-red-200 text-xs sm:text-sm">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />
            <span>
              <strong className="text-white uppercase tracking-wider font-bold">FULL-PAGE MODE REQUIRED:</strong>{' '}
              Investigation protocols require full-screen terminal mode.
            </span>
          </div>
          <CyberButton
            variant="crimson"
            size="sm"
            icon={<Maximize2 className="w-4 h-4" />}
            onClick={requestFullscreen}
          >
            ENTER FULL-PAGE MODE
          </CyberButton>
        </div>
      )}

      {/* Fullscreen Exit Warning Modal - Immediate Auto Re-entry */}
      {mounted && showFullscreenWarningModal && !isTerminated && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 999997,
            backgroundColor: '#030206',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          className="font-mono animate-in fade-in duration-200"
        >
          <div
            style={{
              backgroundColor: '#0c0610',
              border: '2px solid #ef4444',
              boxShadow: '0 0 60px rgba(239,68,68,0.5)',
            }}
            className="relative w-full max-w-lg rounded-xl p-6 sm:p-8 space-y-5 text-center"
          >
            <div className="flex items-center justify-center space-x-2 text-red-500">
              <ShieldAlert className="w-14 h-14 animate-pulse" />
            </div>

            <div className="space-y-1">
              <Badge variant="crimson">PROCTORING SECURITY BREACH</Badge>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wider uppercase">
                FULLSCREEN MODE EXITED
              </h2>
            </div>

            <div
              style={{ backgroundColor: '#160814', border: '1px solid rgba(239,68,68,0.6)' }}
              className="p-4 rounded-lg space-y-3"
            >
              <div className="text-xs font-bold text-red-400 uppercase tracking-widest">
                AUTOMATIC RE-ENGAGEMENT PROTOCOL ACTIVE
              </div>
              <p className="text-xs text-slate-200 font-sans leading-relaxed">
                Investigation integrity strictly requires full-screen terminal operation. Exiting full screen is monitored by Mission Proctoring.
              </p>
              <div
                style={{ backgroundColor: '#0a0309', border: '1px solid rgba(220,38,38,0.5)' }}
                className="p-3 rounded text-xs text-amber-300 font-mono"
              >
                ⚡ Fullscreen mode is required to maintain platform security.
              </div>
            </div>

            <div className="pt-2">
              <CyberButton
                variant="crimson"
                size="lg"
                className="w-full justify-center shadow-[0_0_25px_rgba(239,68,68,0.5)] font-bold tracking-wider"
                onClick={async () => {
                  setShowFullscreenWarningModal(false);
                  try {
                    await requestFullscreen();
                  } catch (err) {
                    console.warn(err);
                  }
                }}
              >
                RESTORE FULLSCREEN
              </CyberButton>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Tab Switch Warning Modal (Violations 1 through 4) - Portaled with Bulletproof Inline Styles */}
      {mounted && showWarningModal && !isTerminated && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 999998,
            backgroundColor: '#020408',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          className="font-mono animate-in fade-in duration-200"
        >
          <div
            style={{
              backgroundColor: '#090e17',
              border: '2px solid #f59e0b',
              boxShadow: '0 0 50px rgba(245,158,11,0.5)',
            }}
            className="relative w-full max-w-lg rounded-xl p-6 sm:p-8 space-y-5 text-center"
          >
            <div className="flex items-center justify-center space-x-2 text-amber-400">
              <AlertTriangle className="w-12 h-12 animate-bounce" />
            </div>

            <div className="space-y-1">
              <Badge variant="amber">PROCTORING SECURITY ALERT</Badge>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wider uppercase">
                TAB SWITCH DETECTED
              </h2>
            </div>

            <div
              style={{ backgroundColor: '#0e1624', border: '1px solid rgba(245,158,11,0.6)' }}
              className="p-4 rounded-lg space-y-3"
            >
              <div className="text-sm font-bold text-amber-300">
                WARNING {warningCount} OF {maxTabSwitches}
              </div>
              <p className="text-xs text-slate-200 font-sans leading-relaxed">
                Leaving or switching away from the Grid terminal is strictly prohibited during the investigation.
              </p>
              <div
                style={{ backgroundColor: '#070b12', border: '1px solid rgba(180,83,9,0.6)' }}
                className="p-3 rounded text-xs text-slate-300 font-mono"
              >
                {remainingSwitches > 0 ? (
                  <span>
                    You have <strong className="text-amber-400 font-bold">{remainingSwitches}</strong> warning(s) remaining before your challenge is{' '}
                    <strong className="text-red-400 font-bold">immediately terminated</strong>.
                  </span>
                ) : (
                  <span className="text-red-400 font-bold">
                    ⚠️ FINAL WARNING: Any subsequent tab switch will immediately end your challenge!
                  </span>
                )}
              </div>
            </div>

            <CyberButton
              variant="amber"
              size="lg"
              className="w-full justify-center"
              onClick={async () => {
                setShowWarningModal(false);
                await requestFullscreen();
              }}
            >
              ACKNOWLEDGE & RESUME FULL-PAGE GRID
            </CyberButton>
          </div>
        </div>,
        document.body
      )}

      {/* Challenge Terminated Modal (Exceeded 4 Tab Switches) - Portaled with Bulletproof Inline Styles */}
      {mounted && showTerminatedModal && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 999999,
            backgroundColor: '#030104',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          className="font-mono animate-in fade-in duration-200"
        >
          <div
            style={{
              backgroundColor: '#0f0409',
              border: '2px solid #ef4444',
              boxShadow: '0 0 60px rgba(239,68,68,0.6)',
            }}
            className="relative w-full max-w-lg rounded-xl p-6 sm:p-8 space-y-6 text-center"
          >
            <div className="flex items-center justify-center text-red-500">
              <XCircle className="w-16 h-16 animate-pulse" />
            </div>

            <div className="space-y-2">
              <Badge variant="crimson">PROCTOR TERMINATION ENFORCED</Badge>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-widest uppercase">
                CHALLENGE TERMINATED
              </h2>
              <p className="text-xs sm:text-sm text-red-300 font-sans">
                You have exceeded the maximum allowed tab switches (<span className="font-bold">{maxTabSwitches}</span>).
              </p>
            </div>

            {/* Score & Time Summary - Solid Panels */}
            <div
              style={{ backgroundColor: '#17060f', border: '1px solid rgba(239,68,68,0.7)' }}
              className="p-4 rounded-lg grid grid-cols-2 gap-4"
            >
              <div
                style={{ backgroundColor: '#220916', border: '1px solid rgba(239,68,68,0.5)' }}
                className="p-3.5 rounded-lg space-y-1"
              >
                <div className="text-[10px] text-slate-300 uppercase tracking-widest flex items-center justify-center gap-1 font-bold">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>FINAL SCORE</span>
                </div>
                <div className="text-2xl font-black text-amber-400">
                  {terminationData?.totalScore ?? 0} PTS
                </div>
              </div>

              <div
                style={{ backgroundColor: '#220916', border: '1px solid rgba(239,68,68,0.5)' }}
                className="p-3.5 rounded-lg space-y-1"
              >
                <div className="text-[10px] text-slate-300 uppercase tracking-widest flex items-center justify-center gap-1 font-bold">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>CHALLENGES</span>
                </div>
                <div className="text-2xl font-black text-cyan-400">
                  {terminationData?.solvedCount ?? 0} SOLVED
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Your challenge has been finalized. Submissions are now permanently closed for your session.
            </p>

            <CyberButton
              variant="crimson"
              size="lg"
              className="w-full justify-center"
              onClick={() => {
                setShowTerminatedModal(false);
                router.push('/mission');
              }}
            >
              VIEW MISSION OVERVIEW
            </CyberButton>
          </div>
        </div>,
        document.body
      )}

      {children}
    </ProctorContext.Provider>
  );
}
