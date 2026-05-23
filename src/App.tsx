import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Unit, 
  Lesson, 
  Question, 
  Student, 
  UserAnswer, 
  PendingRequest, 
  GroupedResult, 
  InteractiveMap,
  TestResult
} from './types';
import { 
  API_URL, 
  SECRET_API_KEY, 
  BASE_STUDENTS, 
  PAYMENT_INFO,
  subjectName, 
  gradeName, 
  simpleHash, 
  toEasternArabic, 
  formatPhoneStr, 
  generateDeviceFingerprint, 
  getDriveDirectLink, 
  getYoutubeEmbedLink 
} from './utils';
import { buildCourseData, FlatQuestionRow } from './courseBuilder';
import { HighlightText } from './components/HighlightText';
import { FormatQuestionText } from './components/FormatQuestionText';
import { DrawingCanvas } from './components/DrawingCanvas';

export default function App() {
  const [screen, setScreen] = useState<string>('home');
  const [studentName, setStudentName] = useState<string>('');
  const [inputPhone, setInputPhone] = useState<string>('');
  const [showPasswordInput, setShowPasswordInput] = useState<boolean>(false);
  const [inputPassword, setInputPassword] = useState<string>('');
  const [selectedTwin, setSelectedTwin] = useState<Student | null>(null);
  
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [showWelcomeSubscribeModal, setShowWelcomeSubscribeModal] = useState<boolean>(false);
  const [registerName, setRegisterName] = useState<string>('');
  const [registerMethod, setRegisterNameMethod] = useState<string>('');
  
  const [platformFee, setPlatformFee] = useState<string>(PAYMENT_INFO.fee);
  const [newFeeInput, setNewFeeInput] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');
  const [studentData, setStudentData] = useState<Student | null>(null);
  
  const [showUnpaidModal, setShowUnpaidModal] = useState<boolean>(false);
  const [unpaidPaymentMethod, setUnpaidPaymentMethod] = useState<string>('');
  
  const [adminResults, setAdminResults] = useState<GroupedResult[]>([]);
  const [adminPendingReqs, setAdminPendingReqs] = useState<PendingRequest[]>([]);
  const [adminActiveTab, setAdminActiveTab] = useState<string>('results');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedAdminStudent, setExpandedAdminStudent] = useState<string | null>(null);
  
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [data, setData] = useState<Unit[]>([]); 
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [feedbackToast, setFeedbackToast] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [expandedUnits, setExpandedUnits] = useState<string[]>([]);
  const [studentsList, setStudentsList] = useState<Record<string, Student | Student[]>>({});
  
  const [isDesktop, setIsDesktop] = useState<boolean>(window.innerWidth >= 768);
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [lessonModalOptions, setLessonModalOptions] = useState<Lesson | null>(null);
  
  // Global Audio Player states
  const [globalAudio, setGlobalAudio] = useState<{ url: string; title: string } | null>(null);
  const [isGlobalAudioPlaying, setIsGlobalAudioPlaying] = useState<boolean>(false);
  const [globalAudioTime, setGlobalAudioTime] = useState<number>(0);
  const [globalAudioDuration, setGlobalAudioDuration] = useState<number>(0);
  const globalAudioRef = useRef<HTMLAudioElement | null>(null);

  const formatAudioTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const toggleGlobalAudio = () => {
    if (!globalAudioRef.current) return;
    if (isGlobalAudioPlaying) {
      globalAudioRef.current.pause();
    } else {
      globalAudioRef.current.play().catch(err => console.log('Playback error:', err));
    }
  };

  const handleGlobalAudioTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    setGlobalAudioTime(e.currentTarget.currentTime);
  };

  const handleGlobalAudioLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    setGlobalAudioDuration(e.currentTarget.duration);
  };

  const handleGlobalAudioSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (globalAudioRef.current) {
      globalAudioRef.current.currentTime = val;
      setGlobalAudioTime(val);
    }
  };

  const playLessonAudio = (url: string, title: string) => {
    if (globalAudio?.url === url) {
      toggleGlobalAudio();
    } else {
      setGlobalAudio({ url, title });
      setGlobalAudioTime(0);
      setGlobalAudioDuration(0);
      setIsGlobalAudioPlaying(true);
    }
  };

  useEffect(() => {
    if (globalAudio && globalAudioRef.current) {
      const directUrl = getDriveDirectLink(globalAudio.url);
      globalAudioRef.current.src = directUrl;
      globalAudioRef.current.load();
      globalAudioRef.current.play()
        .then(() => {
          setIsGlobalAudioPlaying(true);
        })
        .catch(err => {
          console.log('Playback error on url change:', err);
          setIsGlobalAudioPlaying(false);
        });
    } else if (!globalAudio && globalAudioRef.current) {
      globalAudioRef.current.pause();
      globalAudioRef.current.src = "";
    }
  }, [globalAudio?.url]);
  
  const [announcement, setAnnouncement] = useState<string>('');
  const [announcementInput, setAnnouncementInput] = useState<string>('');
  
  const [activeMapUrl, setActiveMapUrl] = useState<string | null>(null);
  const [mapsList, setMapsList] = useState<InteractiveMap[]>([]);
  
  const [mistakesBank, setMistakesBank] = useState<Question[]>(() => {
    try {
      const saved = localStorage.getItem('mistakesBank');
      return saved ? JSON.parse(saved) : [];
    } catch(e) { return []; }
  });
  
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  
  // PWA states and instructions
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSInstallGuide, setShowIOSInstallGuide] = useState<boolean>(false);
  const [installTab, setInstallTab] = useState<'android' | 'ios' | 'pc'>('android');

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /ipad|iphone|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);
    if (isIosDevice) {
      setInstallTab('ios');
    } else {
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      if (isMobile) {
        setInstallTab('android');
      } else {
        setInstallTab('pc');
      }
    }

    const checkStandalone = () => {
      const isStandaloneMode = (window.navigator as any).standalone || 
                               window.matchMedia('(display-mode: standalone)').matches ||
                               window.matchMedia('(display-mode: fullscreen)').matches ||
                               window.matchMedia('(display-mode: minimal-ui)').matches;
      return isStandaloneMode;
    };

    if (checkStandalone()) {
      setShowInstallBtn(false);
    } else {
      // Check if deferredPrompt is already stored on window by our early-listener
      const earlyPrompt = (window as any).deferredPrompt;
      if (earlyPrompt) {
        setDeferredPrompt(earlyPrompt);
        setShowInstallBtn(true);
      } else if (isIosDevice) {
        // iOS doesn't have beforeinstallprompt but supports manual install guide
        setShowInstallBtn(true);
      } else {
        // Under non-iOS, do not show until beforeinstallprompt actually fires!
        // This ensures on Android we ONLY show the button when "real native installation" is available,
        // and we don't display it to add a mere shortcut if the prompt is not ready.
        setShowInstallBtn(false);
      }
    }

    const handlePromptAvailable = (e: any) => {
      if (!checkStandalone()) {
        setDeferredPrompt((window as any).deferredPrompt || e);
        setShowInstallBtn(true);
      }
    };

    const handleInstalled = () => {
      setShowInstallBtn(false);
      setDeferredPrompt(null);
    };
    
    // Check if the prompt is already available from the early listener
    if ((window as any).deferredPrompt) {
      handlePromptAvailable((window as any).deferredPrompt);
    } else if (isIosDevice && !checkStandalone()) {
      // For iOS, we always show the button if not in standalone mode
      setShowInstallBtn(true);
    }

    // Listen for the custom event from the early script
    window.addEventListener('pwa-prompt-available', handlePromptAvailable);
    window.addEventListener('pwa-installed', handleInstalled);
    
    // Also keep local listeners as fallback
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
      if (!checkStandalone()) {
        setShowInstallBtn(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    // Fallback for browsers that might not fire the event early
    window.addEventListener('beforeinstallprompt', handlePromptAvailable);

    return () => {
      window.removeEventListener('pwa-prompt-available', handlePromptAvailable);
      window.removeEventListener('pwa-installed', handleInstalled);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstallGuide(true);
      return;
    }
    
    if (!deferredPrompt) {
      setShowIOSInstallGuide(true);
      return;
    }
    
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallBtn(false);
      }
    } catch (err) {
      console.error('PWA installation prompt failed:', err);
      setShowIOSInstallGuide(true);
    }
  };

  interface DialogState {
    isOpen: boolean;
    message: string;
    type: 'alert' | 'confirm';
    onConfirm: (() => void) | null;
  }
  
  const [dialog, setDialog] = useState<DialogState>({ 
    isOpen: false, 
    message: '', 
    type: 'alert', 
    onConfirm: null 
  });
  
  const showAlert = (message: string) => setDialog({ isOpen: true, message, type: 'alert', onConfirm: null });
  const showConfirm = (message: string, onConfirm: () => void) => setDialog({ isOpen: true, message, type: 'confirm', onConfirm });
  const closeDialog = () => setDialog({ isOpen: false, message: '', type: 'alert', onConfirm: null });
  
  useEffect(() => {
    window.history.pushState({ screen: 'home' }, '');
    const handlePopState = () => {
      if (screen === 'quiz') {
        showConfirm('هل أنت متأكد من مغادرة الاختبار؟\nسيتم حفظ تقدمك الحالي.', () => setScreen('index'));
        window.history.pushState({ screen: 'quiz' }, ''); 
      }
      else if (screen === 'index') {
        window.history.pushState({ screen: 'index' }, ''); 
      }
      else if (screen === 'result') setScreen('index');
      else if (screen === 'admin') setScreen('home');
      else window.history.pushState(null, ''); 
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [screen]);
  
  useEffect(() => {
    if (screen === 'quiz' && activeLesson && activeLesson.id !== 'mistakes_bank') {
      const sessionData = { 
        lessonId: activeLesson.id, 
        unitId: data.find(u => u.lessons.some(l => l.id === activeLesson.id))?.id, 
        answers: userAnswers, 
        currentIndex: currentQIndex 
      };
      localStorage.setItem('savedSession', JSON.stringify(sessionData));
    } else if (screen === 'result') {
      localStorage.removeItem('savedSession');
    }
  }, [screen, activeLesson, userAnswers, currentQIndex, data]);
  
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const response = await fetch(`${API_URL}?action=getAllStudents&apiKey=${SECRET_API_KEY}`);
        const result = await response.json();
        if(result.status === 'success') {
          if(result.data) {
            setStudentsList(result.data);
            const savedPhone = localStorage.getItem('loggedInPhone');
            const savedUserStr = localStorage.getItem('loggedInUser');
            if (savedPhone && savedUserStr) {
        let savedUser: Student | null = null;
        try { savedUser = JSON.parse(savedUserStr); } catch(e) {}
        if (savedUser) {
          let liveStudents = result.data[savedPhone];
          if (liveStudents) {
            if (!Array.isArray(liveStudents)) liveStudents = [liveStudents];
            const liveSt = (liveStudents as Student[]).find(s => s.name === savedUser?.name);
            if (liveSt && (liveSt.isPaid === false || (liveSt.missingMonths && liveSt.missingMonths.length > 0))) {
              localStorage.removeItem('loggedInUser');
              localStorage.removeItem('loggedInPhone');
              setStudentData(null);
              setStudentName('');
              setScreen('home');
            }
          }
              }
            }
          }
          if(result.fee) setPlatformFee(result.fee);
          if(result.announcement !== undefined) setAnnouncement(result.announcement); 
        }
      } catch(e) {}
    };
    loadStudents();
  }, []);
  
  useEffect(() => {
    const savedUser = localStorage.getItem('loggedInUser');
    const savedPhone = localStorage.getItem('loggedInPhone');
    if (savedUser && savedPhone) {
      try {
        const st: Student | null = JSON.parse(savedUser);
        // Safety check to ensure the parsed user is not null before using it
        if (st) {
          setStudentData(st);
          setStudentName(st.name);
          setInputPhone(savedPhone);
          if (st.isPaid || !st.missingMonths || st.missingMonths.length === 0) {
            setScreen('returning_welcome');
          }
        }
      } catch(e) {}
      
      // Pre-fetch questions data to ensure stats.total is populated and ready immediately
      const prefetchCourseData = async () => {
        try {
          const noCache = new Date().getTime();
          const qRes = await fetch(`${API_URL}?action=getQuestions&apiKey=${SECRET_API_KEY}&t=${noCache}`);
          const qData = await qRes.json();
          if (qData.status === 'success') {
            const builtData = buildCourseData(qData.data as FlatQuestionRow[]);
            setData(builtData);
            setExpandedUnits([]);
            if (qData.maps) setMapsList(qData.maps as InteractiveMap[]);
          }
        } catch (e) {
          console.error("Course prefetch error:", e);
        }
      };
      prefetchCourseData();
    }
  }, []);

  useEffect(() => {
    // Clean and crisp dynamic PWA icon renderer
    const generatePwaIcons = async () => {
      try {
        if (!('caches' in window)) return;
        const cache = await caches.open('kanz-cache-v1');
        const cachedIcon = await cache.match('./icon.png');
        if (cachedIcon) return; // already compiled

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = './icon.svg';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, 512, 512);
            canvas.toBlob(async (blob) => {
              if (blob) {
                const response = new Response(blob, {
                  headers: { 'Content-Type': 'image/png' }
                });
                await cache.put('./icon.png', response.clone());
                await cache.put('./apple-touch-icon.png', response);
              }
            }, 'image/png');
          }
        };
      } catch (e) {
        console.warn(e);
      }
    };
    generatePwaIcons();
  }, []);
  
  useEffect(() => {
    setAnnouncementInput(announcement);
  }, [announcement]);
  
  const toggleUnit = (unitId: string) => setExpandedUnits(prev => prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]);
  
  const toggleFullscreen = () => { 
    if (!document.fullscreenElement) { 
      document.documentElement.requestFullscreen().catch(e => console.log(e)); 
      setIsFullscreen(true); 
    } else { 
      document.exitFullscreen(); 
      setIsFullscreen(false); 
    } 
  };
  
  const stats = useMemo(() => {
    let total = 0, completed = 0;
    data.forEach(unit => { 
      unit.lessons.forEach(l => { 
        total++; 
        if (l.completed) completed++; 
      }); 
    });
    return { 
      total, 
      completed, 
      remaining: total - completed, 
      progress: total ? Math.round((completed/total)*100) : 0 
    };
  }, [data]);
  
  useEffect(() => {
    if (stats.total > 0) {
      localStorage.setItem('userStats', JSON.stringify(stats));
    }
  }, [stats]);
  
  const handleResume = async () => {
    setIsLoading(true);
    try {
      const noCache = new Date().getTime();
      const qRes = await fetch(`${API_URL}?action=getQuestions&apiKey=${SECRET_API_KEY}&t=${noCache}`); 
      const qData = await qRes.json();
      if (qData.status === 'success') {
        const builtData = buildCourseData(qData.data as FlatQuestionRow[]);
        setData(builtData);
        setExpandedUnits([]);
        if (qData.maps) setMapsList(qData.maps as InteractiveMap[]); else setMapsList([]); 
        const session = localStorage.getItem('savedSession');
        if (session) {
          let parsedSession: any = null;
          try { parsedSession = JSON.parse(session); } catch(e) {}
          if (parsedSession) {
            let foundLesson: Lesson | null = null;
            builtData.forEach(u => { 
              const l = u.lessons.find(l => l.id === parsedSession.lessonId); 
              if (l) foundLesson = l; 
            });
            if (foundLesson) {
              setActiveLesson(foundLesson); 
              setUserAnswers(parsedSession.answers || []); 
              setCurrentQIndex(parsedSession.currentIndex || 0); 
              setScreen('quiz');
            } else {
              setScreen('index');
            }
          } else {
            setScreen('index');
          }
        } else {
          setScreen('index');
        }
      } else { 
        setLoginError("فشل تحميل الأسئلة من السيرفر."); 
        setScreen('home'); 
      }
    } catch(e) { 
      setLoginError("حدث خطأ أثناء جلب الأسئلة."); 
      setScreen('home'); 
    }
    setIsLoading(false);
  };
  
  const handleStartFresh = async () => {
    setIsLoading(true);
    try {
      const noCache = new Date().getTime();
      const qRes = await fetch(`${API_URL}?action=getQuestions&apiKey=${SECRET_API_KEY}&t=${noCache}`); 
      const qData = await qRes.json();
      if (qData.status === 'success') {
        const builtData = buildCourseData(qData.data as FlatQuestionRow[]);
        setData(builtData);
        setExpandedUnits([]);
        if (qData.maps) setMapsList(qData.maps as InteractiveMap[]); else setMapsList([]); 
        setScreen('index');
      } else { 
        setLoginError("فشل تحميل الأسئلة من السيرفر."); 
        setScreen('home'); 
      }
    } catch(e) { 
      setLoginError("حدث خطأ أثناء جلب الأسئلة."); 
      setScreen('home'); 
    }
    setIsLoading(false);
  };
  
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const noCache = new Date().getTime();
      const qRes = await fetch(`${API_URL}?action=getQuestions&apiKey=${SECRET_API_KEY}&t=${noCache}`);
      const qData = await qRes.json();
      
      const sRes = await fetch(`${API_URL}?action=getAllStudents&apiKey=${SECRET_API_KEY}&t=${noCache}`);
      const sData = await sRes.json();
      
      if (qData.status === 'success') {
        const builtData = buildCourseData(qData.data as FlatQuestionRow[]);
        setData(builtData);
        setExpandedUnits([]);
        if (qData.maps) setMapsList(qData.maps as InteractiveMap[]); else setMapsList([]); 
        if (sData.status === 'success') {
          if (sData.announcement !== undefined) setAnnouncement(sData.announcement);
          if (sData.fee) setPlatformFee(sData.fee);
          if (sData.data) setStudentsList(sData.data);
        }
        showAlert('تم تحديث المحتوى والإشعارات بنجاح! 🚀');
      } else {
        showAlert("فشل التحديث من السيرفر.");
      }
    } catch(e) {
      showAlert("حدث خطأ أثناء جلب التحديثات.");
    }
    setIsLoading(false);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('loggedInPhone');
    setStudentData(null);
    setStudentName('');
    setInputPhone('');
    setInputPassword('');
    setShowPasswordInput(false);
    setScreen('home');
  };
  
  const handleLogin = async () => {
    setLoginError(''); 
    const formattedPhone = formatPhoneStr(inputPhone);
    if (!formattedPhone || formattedPhone.length < 10) { 
      setLoginError('يرجى إدخال رقم هاتف صحيح.'); 
      return; 
    }
    setIsLoading(true);
    
    const loadQuestionsAndNavigate = async (targetScreen: string) => {
      try {
        const noCache = new Date().getTime();
        const qRes = await fetch(`${API_URL}?action=getQuestions&apiKey=${SECRET_API_KEY}&t=${noCache}`); 
        const qData = await qRes.json();
        if (qData.status === 'success') {
          const builtData = buildCourseData(qData.data as FlatQuestionRow[]);
          setData(builtData);
          setExpandedUnits([]);
          if (qData.maps) setMapsList(qData.maps as InteractiveMap[]); else setMapsList([]); 
          setScreen(targetScreen); 
        } else {
          setLoginError("فشل تحميل الأسئلة من السيرفر.");
        }
      } catch(e) { 
        setLoginError("حدث خطأ أثناء جلب الأسئلة."); 
      }
    };
    
    if (BASE_STUDENTS[formattedPhone]) {
      if (!showPasswordInput) { 
        setShowPasswordInput(true); 
        setIsLoading(false); 
        return; 
      }
      const user = BASE_STUDENTS[formattedPhone];
      const inputHash = simpleHash(inputPassword);
      if (inputHash === user.passHash) {
        setStudentName(user.name);
        if (user.role === 'admin') { 
          fetchAdminData(); 
          await loadQuestionsAndNavigate('admin'); 
        } else if (user.role === 'secretary') { 
          await loadQuestionsAndNavigate('index'); 
        }
        setShowPasswordInput(false); 
        setInputPassword('');
      } else {
        setLoginError("الرقم السري خاطئ.");
      }
      setIsLoading(false); 
      return;
    }
    
    let localStudents = studentsList[formattedPhone];
    if (localStudents) {
      if (!Array.isArray(localStudents)) localStudents = [localStudents];
      const studentsArr = localStudents as Student[];
      if (studentsArr.length > 1 && !selectedTwin) { 
        setLoginError('اختر اسمك من القائمة أولاً.'); 
        setIsLoading(false); 
        return; 
      }
      const st = selectedTwin || studentsArr[0];
      
      if (st.isPaid === false || (st.missingMonths && st.missingMonths.length > 0)) {
        setStudentData(st); 
        setShowUnpaidModal(true); 
        setIsLoading(false); 
        return;
      }
      
      setStudentName(st.name); 
      setStudentData(st);
      
      const fingerprint = generateDeviceFingerprint();
      try {
        const fpRes = await fetch(API_URL, { 
          method: 'POST', 
          body: JSON.stringify({ 
            action: 'saveDeviceFingerprint', 
            phone: `${formattedPhone}_${st.name}`, 
            fingerprint: fingerprint, 
            apiKey: SECRET_API_KEY 
          }) 
        });
        const fpData = await fpRes.json();
        if (fpData.status === 'blocked') { 
          setLoginError('لا يمكن فتح التطبيق! لقد سبق واستخدم هذا الحساب في متصفح آخر.'); 
          setIsLoading(false); 
          return; 
        }
      } catch(e) {}
      
      localStorage.setItem('loggedInUser', JSON.stringify(st));
      localStorage.setItem('loggedInPhone', formattedPhone);
      await loadQuestionsAndNavigate('index');
      setIsLoading(false); 
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}?action=login&phone=${formattedPhone}&apiKey=${SECRET_API_KEY}`);
      const result = await response.json();
      if (result.status === 'success') {
        const fetchedStudents: Student[] = Array.isArray(result.student) ? result.student : [result.student];
        if (fetchedStudents.length > 1 && !selectedTwin) {
          setStudentsList(prev => ({...prev, [formattedPhone]: fetchedStudents}));
          setLoginError('الرجاء اختيار اسمك أولاً.'); 
          setIsLoading(false); 
          return;
        }
        const st = selectedTwin || fetchedStudents[0];
        
        if (st.isPaid === false || (st.missingMonths && st.missingMonths.length > 0)) {
          setStudentData(st); 
          setShowUnpaidModal(true); 
          setIsLoading(false); 
          return;
        }
        
        setStudentName(st.name); 
        setStudentData(st);
        
        const fingerprint = generateDeviceFingerprint();
        const fpRes = await fetch(API_URL, { 
          method: 'POST', 
          body: JSON.stringify({ 
            action: 'saveDeviceFingerprint', 
            phone: `${formattedPhone}_${st.name}`, 
            fingerprint: fingerprint, 
            apiKey: SECRET_API_KEY 
          }) 
        });
        const fpData = await fpRes.json();
        if (fpData.status === 'blocked') { 
          setLoginError('لا يمكن فتح التطبيق! لقد سبق واستخدم هذا الحساب في متصفح آخر.'); 
          setIsLoading(false); 
          return; 
        }
        
        localStorage.setItem('loggedInUser', JSON.stringify(st));
        localStorage.setItem('loggedInPhone', formattedPhone);
        await loadQuestionsAndNavigate('index');
      } else if (result.status === 'unregistered' || result.message === 'الرقم غير مسجل لدينا.') {
        const reqRes = await fetch(`${API_URL}?action=getPendingRequests&apiKey=${SECRET_API_KEY}`); 
        const reqData = await reqRes.json();
        if (reqData.status === 'success' && reqData.data && (reqData.data as PendingRequest[]).some(r => formatPhoneStr(r.phone) === formattedPhone)) {
          setLoginError('طلبك قيد مراجعة الإدارة.');
        } else {
          setShowWelcomeSubscribeModal(true);
        }
      } else {
        setLoginError(result.message || 'حدث خطأ.');
      }
    } catch (error) { 
      setLoginError('خطأ في الاتصال بالإنترنت.'); 
    }
    setIsLoading(false);
  };
  
  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}?action=getResults&apiKey=${SECRET_API_KEY}`); 
      const resData = await res.json();
      if(resData.status === 'success') {
        const grouped: Record<string, { phone: string; tests: TestResult[] }> = {};
        (resData.data as TestResult[]).forEach(r => {
          if(!grouped[r.name]) grouped[r.name] = { phone: r.phone, tests: [] };
          grouped[r.name].tests.push(r);
        });
        const sortedArray: GroupedResult[] = Object.keys(grouped)
          .sort((a,b)=>a.localeCompare(b, 'ar'))
          .map(k => ({ name: k, phone: grouped[k].phone, tests: grouped[k].tests }));
        setAdminResults(sortedArray);
      }
      const reqRes = await fetch(`${API_URL}?action=getPendingRequests&apiKey=${SECRET_API_KEY}`); 
      const reqData = await reqRes.json();
      if(reqData.status === 'success') {
        setAdminPendingReqs(reqData.data as PendingRequest[]);
      }
    } catch(e) { 
      showAlert('فشل الاتصال بقاعدة البيانات.'); 
    }
    setIsLoading(false);
  };
  
  const handleRegisterSubmit = async () => {
    if (!registerName || !registerMethod) { 
      showAlert('أدخل الاسم واختر طريقة الدفع.'); 
      return; 
    }
    const formattedPhone = formatPhoneStr(inputPhone); 
    const sheetPhone = '+20' + formattedPhone.substring(1);
    const whatsappMsg = `السلام عليكم ورحمة الله وبركاته، أ/ إسلام سعود.\nأود الاشتراك في منصة الكنز التعليمي\nالاسم: ${registerName}\nرقم الهاتف: ${inputPhone}\nالمرحلة: ${gradeName}\nقمت بالسداد من خلال: ${registerMethod}\n(سأقوم بإرفاق صورة التحويل الآن لتأكيد السداد)`;
    window.open(`https://wa.me/201228466613?text=${encodeURIComponent(whatsappMsg)}`, '_blank');
    try { 
      fetch(API_URL, { 
        method: 'POST', 
        mode: 'no-cors', 
        body: JSON.stringify({ 
          action: 'requestSubscription', 
          date: new Date().toLocaleString('ar-EG'), 
          name: registerName, 
          phone: sheetPhone, 
          method: registerMethod, 
          apiKey: SECRET_API_KEY 
        }) 
      }); 
    } catch(e) {}
  };
  
  const handleActivateMonth = async (phone: string, name: string, month: string) => {
    showConfirm(`تفعيل شهر (${month}) للطالب: ${name}؟`, async () => {
      try {
        fetch(API_URL, { 
          method: 'POST', 
          mode: 'no-cors', 
          body: JSON.stringify({ 
            action: 'activateSpecificMonth', 
            phone: phone, 
            month: month, 
            apiKey: SECRET_API_KEY 
          }) 
        });
        setStudentsList(prev => {
          const newList = {...prev};
          if(newList[phone]) {
            const listArr = Array.isArray(newList[phone]) ? newList[phone] : [newList[phone]];
            newList[phone] = (listArr as Student[]).map(s => 
              s.name === name 
                ? { 
                    ...s, 
                    missingMonths: s.missingMonths ? s.missingMonths.filter(m => m !== month) : [], 
                    isPaid: s.missingMonths ? s.missingMonths.length <= 1 : true 
                  } 
                : s
            );
          }
          return newList;
        });
        showAlert(`تم تفعيل شهر ${month}`);
      } catch(e) { 
        showAlert('حدث خطأ'); 
      }
    });
  };
  
  const handleApproveSubscription = async (phone: string, name: string) => {
    showConfirm(`تفعيل حساب: ${name}؟`, async () => {
      window.open(`https://wa.me/20${formatPhoneStr(phone).substring(1)}?text=${encodeURIComponent(`أهلاً بك ${name} تم التفعيل`)}`, '_blank');
      setAdminPendingReqs(prev => prev.filter(req => req.phone !== phone || req.name !== name));
      try { 
        await fetch(API_URL, { 
          method: 'POST', 
          mode: 'no-cors', 
          body: JSON.stringify({ 
            action: 'approveSubscription', 
            phone: phone, 
            name: name, 
            apiKey: SECRET_API_KEY 
          }) 
        }); 
        showAlert('تم التفعيل بنجاح وإضافة الطالب لجوجل شيت!'); 
        setTimeout(fetchAdminData, 2000);
      } catch(e) { 
        showAlert('خطأ في الاتصال بالخادم'); 
      }
    });
  };
  
  const handleRejectSubscription = async (phone: string, name: string) => {
    showConfirm(`رفض طلب: ${name}؟`, async () => {
      setAdminPendingReqs(prev => prev.filter(req => req.phone !== phone || req.name !== name));
      try { 
        await fetch(API_URL, { 
          method: 'POST', 
          mode: 'no-cors', 
          body: JSON.stringify({ 
            action: 'rejectSubscription', 
            phone: phone, 
            name: name, 
            apiKey: SECRET_API_KEY 
          }) 
        }); 
        showAlert('تم الرفض وإزالة الطلب من جوجل شيت!'); 
        setTimeout(fetchAdminData, 2000);
      } catch(e) { 
        showAlert('خطأ في الاتصال بالخادم'); 
      }
    });
  };
  
  const handleUpdateFee = async () => {
    const finalFee = newFeeInput ? newFeeInput : platformFee;
    setIsLoading(true);
    try {
      await fetch(API_URL, { 
        method: 'POST', 
        mode: 'no-cors', 
        body: JSON.stringify({ 
          action: 'updateSettings', 
          fee: finalFee, 
          announcement: announcementInput, 
          apiKey: SECRET_API_KEY 
        }) 
      });
      showAlert('تم حفظ الإعدادات وتحديث الإشعار للطلاب بنجاح! 📢');
      setPlatformFee(finalFee);
      setAnnouncement(announcementInput);
      setNewFeeInput('');
    } catch(e) { 
      showAlert('خطأ في الاتصال بالإنترنت'); 
    }
    setIsLoading(false);
  };
  
  const saveResultToDB = async (scoreObj: { quizName: string; score: string }) => {
    try {
      const formattedPhone = formatPhoneStr(inputPhone); 
      if (BASE_STUDENTS[formattedPhone]) return;
      await fetch(API_URL, { 
        method: 'POST', 
        body: JSON.stringify({ 
          action: 'saveResult', 
          phone: formattedPhone.startsWith('0') ? '+20'+formattedPhone.substring(1) : formattedPhone, 
          name: studentName, 
          quiz: scoreObj.quizName, 
          score: scoreObj.score, 
          date: new Date().toLocaleString('ar-EG'), 
          apiKey: SECRET_API_KEY 
        }) 
      });
    } catch(e) {}
  };
  
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };
  
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    touchEndX.current = e.touches[0].clientX;
  };
  
  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null || isDrawingMode || !activeLesson) return;
    
    const swipeDistance = touchStartX.current - touchEndX.current;
    
    if (swipeDistance > 40) {
      if (isAnswered && currentQIndex < activeLesson.questions.length - 1) {
        setCurrentQIndex(currentQIndex + 1);
      } else if (isAnswered && currentQIndex === activeLesson.questions.length - 1) {
        handleFinishQuiz();
      }
    } else if (swipeDistance < -40) {
      if (currentQIndex > 0) {
        setCurrentQIndex(currentQIndex - 1);
      }
    }
    
    touchStartX.current = null;
    touchEndX.current = null;
  };
  
  const handleFinishQuiz = () => {
    if (activeLesson) {
      const totalQs = activeLesson.questions.length;
      const correct = userAnswers.filter(a => a.isCorrect).length;
      const perc = Math.round((correct/totalQs)*100);
      if (activeLesson.id !== 'mistakes_bank') {
        saveResultToDB({ quizName: activeLesson.title, score: `${perc}%` });
      }
    }
    setScreen('result');
  };
  
  const startQuizForLesson = (lesson: Lesson) => {
    const session = localStorage.getItem('savedSession'); 
    let restored = false;
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed.lessonId === lesson.id) {
        setActiveLesson(lesson); 
        setUserAnswers(parsed.answers || []); 
        setCurrentQIndex(parsed.currentIndex || 0); 
        setScreen('quiz'); 
        restored = true;
      }
    }
    if (!restored) { 
      setActiveLesson(lesson); 
      setCurrentQIndex(0); 
      setUserAnswers([]); 
      setScreen('quiz'); 
    }
    setLessonModalOptions(null); 
  };
  
  let isAnswered = false; 
  let currentAnswer: UserAnswer | null = null; 
  let question: Question | null = null; 
  let totalQs = 0;
  
  if (screen === 'quiz' && activeLesson) {
    question = activeLesson.questions[currentQIndex]; 
    totalQs = activeLesson.questions.length;
    if (question) {
      isAnswered = userAnswers[currentQIndex] !== undefined; 
      currentAnswer = userAnswers[currentQIndex] || null;
    }
  }
  
  const formatLessonTitleJSX = (title: string) => {
    if (!title) return title;
    const parts = title.split(':');
    if (parts.length > 1) {
      return (
        <>
          <span className="text-secondary font-black" style={{ fontSize: '18px' }}>{parts[0]}:</span>
          {parts.slice(1).join(':')}
        </>
      );
    }
    return title;
  };
  
  const renderScreen = () => {
    if (screen === 'returning_welcome') {
      const savedStatsStr = localStorage.getItem('userStats');
      let savedStats = null;
      try { savedStats = savedStatsStr ? JSON.parse(savedStatsStr) : null; } catch(e) {}
      const session = localStorage.getItem('savedSession');
      const hasSession = !!session;
      
      return (
        <div className="min-h-[100dvh] w-full flex items-center justify-center p-4 bg-gray-50 watermark-container">
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl text-center max-w-md w-full border-t-8 border-secondary animate-fade-in relative overflow-hidden">
            <i className="fas fa-hand-sparkles text-5xl sm:text-6xl text-secondary mb-4 block relative z-10"></i>
            <h2 className="text-2xl sm:text-3xl font-black text-primary mb-2 relative z-10">مرحباً يا بطل {studentName.split(' ')[0]}!</h2>
            
            <p className="text-gray-800 text-lg sm:text-xl font-bold mb-6 mt-3 relative z-10 leading-relaxed">
              تحب تكمل آخر حاجة عملناها ولا نبدأ من جديد؟ ❤️
            </p>

            {savedStats && savedStats.completed > 0 && (
              <div className="mb-6 relative z-10 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <p className="text-sm text-gray-700 font-bold mb-1">
                  مستوى تقدمك الحالي 🏆:
                </p>
                <p className="text-base text-gray-800 font-black">
                  لقد أنجزت <span className="text-secondary font-black text-lg mx-1">{toEasternArabic(savedStats.completed)}</span> من أصل <span className="text-primary font-black text-lg mx-1">{toEasternArabic(stats.total || savedStats.total)}</span> دروس بنجاح!
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 relative z-10 w-full">
              {hasSession && (
                <button 
                  onClick={handleResume} 
                  disabled={isLoading} 
                  className="bg-secondary text-white font-black text-lg sm:text-xl py-3.5 px-6 rounded-2xl w-full shadow-md hover:bg-green-600 transition-colors flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-play-circle text-xl animate-pulse"></i> إكمال آخر حاجة عملناها</>}
                </button>
              )}
              
              <button 
                onClick={handleStartFresh} 
                disabled={isLoading} 
                className="bg-primary text-white font-black text-lg sm:text-xl py-3.5 px-6 rounded-2xl w-full shadow-md hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                {isLoading && !hasSession ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-compass text-xl"></i> ابدأ (الفهرس الشامل)</>}
              </button>

              <button onClick={handleLogout} className="text-gray-500 font-bold text-sm underline hover:text-red-500 mt-3 relative z-10 cursor-pointer">
                تسجيل خروج (لست {studentName.split(' ')[0]})
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    if (screen === 'home') {
      const livePhone = formatPhoneStr(inputPhone); 
      const liveAdmin = BASE_STUDENTS[livePhone];
      let liveStudents = studentsList[livePhone]; 
      if (liveStudents && !Array.isArray(liveStudents)) liveStudents = [liveStudents];
      const studentsArr = liveStudents as Student[];
      
      return (
        <div className="h-[100dvh] w-full flex items-center justify-center p-4 md:p-6 overflow-y-auto custom-scrollbar relative bg-[#f8fafc] watermark-container">
          <div className="w-full max-w-2xl flex flex-col items-center gap-4 sm:gap-5 py-6 z-10 my-auto">
            
            <i className="fas fa-graduation-cap text-5xl sm:text-7xl md:text-8xl text-gold drop-shadow-sm mb-1.5" style={{ fontSize: '70px', lineHeight: '26px' }}></i>
            <div className="flex flex-row items-center justify-center gap-2 sm:gap-4 mb-2">
              <span className="text-primary font-black sm:text-7xl md:text-8xl tracking-tighter" style={{ fontSize: '35px', lineHeight: '35px' }}>موسوعة</span>
              <div className="w-1.5 h-11 sm:h-20 bg-primary rounded-sm"></div>
              <div className="flex flex-col justify-center text-right">
                <span className="font-black sm:text-3xl md:text-4xl text-gold mb-0.5" style={{ fontSize: '25px', lineHeight: '39px', marginTop: '-2px', marginBottom: '-2px' }}>الكنز</span>
                <span className="text-primary font-black sm:text-3xl md:text-4xl">التعليمي</span>
              </div>
            </div>
            <div className="text-center space-y-2 px-2 mt-1">
              <h2 className="text-lg sm:text-xl md:text-2xl font-black text-gray-800" style={{ textAlign: 'center', fontWeight: 'bold', marginTop: '-13px' }}>بوابتك الذكية لإتقان <span className="text-secondary">({subjectName})</span></h2>
              <p className="sm:text-base md:text-lg text-gray-700 max-w-md mx-auto leading-relaxed border-2 border-gold bg-white/70 backdrop-blur-md p-3 rounded-2xl shadow-sm mt-2" style={{ fontSize: '13px', fontWeight: 'bold', color: '#000000', paddingLeft: '17px', paddingRight: '16px', paddingBottom: '14px', paddingTop: '14px', marginLeft: '-2px', lineHeight: '25.125px' }}>ومنصتك الشاملة للمراجعة النهائية واختبار قدراتك قبل الامتحان بأسلوب تفاعلي مميز وعصري.</p>
            </div>
            <div className="inline-block bg-primary text-white px-8 py-2 rounded-full font-bold shadow-md text-sm sm:text-base text-center" style={{ marginTop: '-9px', marginBottom: '-18px' }}>لـ {gradeName}</div>
            
            <div className="w-full max-w-xs sm:max-w-sm md:max-w-md bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-6 md:p-8 pt-10 border border-gray-100 flex flex-col items-center gap-4 relative mt-2">
              <div className="absolute top-0 right-0 bg-secondary text-white text-xs sm:text-sm font-black px-5 py-2 rounded-tr-[1.5rem] rounded-bl-[1.5rem] shadow-sm" style={{ marginBottom: '-12px' }}>مراجعة ليلة الامتحان</div>
              <h3 className="text-xl sm:text-2xl font-black text-primary mt-4" style={{ marginTop: '1px', marginBottom: '-9px' }}>ابدأ رحلتك الآن</h3>
              
              <div className="w-full relative mt-2">
                <input 
                  type="tel" 
                  placeholder="أدخل رقم الهاتف المسجل لدينا" 
                  className={`w-full text-center border-b-2 border-gray-200 focus:border-primary outline-none py-3 text-sm sm:text-base font-bold text-gray-600 transition-colors ${showPasswordInput ? 'opacity-50' : ''}`} 
                  value={inputPhone} 
                  onChange={(e) => { 
                    setInputPhone(e.target.value); 
                    setSelectedTwin(null); 
                    if (showPasswordInput) { 
                      setShowPasswordInput(false); 
                      setInputPassword(''); 
                    } 
                  }} 
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()} 
                  disabled={showPasswordInput} 
                  style={{ marginTop: '-18px', marginBottom: '2px' }}
                />
                {liveAdmin && !showPasswordInput && <div className="text-secondary font-black text-sm mt-3 text-center">مرحباً يا : {liveAdmin.name}</div>}
                {liveStudents && !showPasswordInput && !liveAdmin && (
                  <div className="w-full mt-4">
                    {studentsArr.length === 1 ? <div className="text-secondary font-black text-sm text-center">مرحباً يا : {studentsArr[0].name}</div> : (
                      <div className="flex flex-col gap-2 items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <div className="text-primary font-bold text-sm text-center">يوجد أكثر من طالب، هل أنت:</div>
                        <div className="flex flex-wrap justify-center gap-2">
                          {studentsArr.map((st, idx) => (
                            <button 
                              key={idx} 
                              onClick={() => { 
                                setSelectedTwin(st); 
                                setLoginError(''); 
                              }} 
                              className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm border-2 ${selectedTwin?.name === st.name ? 'bg-secondary text-white border-secondary' : 'bg-white text-gray-700 hover:border-secondary'}`}
                            >
                              {st.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {showPasswordInput && (
                  <div className="w-full text-center mt-4">
                    <div className="text-secondary font-black text-sm mb-2">مرحباً يا : {liveAdmin?.name}</div>
                    <input 
                      type="password" 
                      placeholder="الرقم السري" 
                      className="w-full text-center border-b-2 border-gray-300 focus:border-secondary outline-none py-2 text-base font-bold" 
                      value={inputPassword} 
                      onChange={(e) => setInputPassword(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()} 
                      autoFocus 
                    />
                  </div>
                )}
                {loginError && <div className="text-red-500 text-xs sm:text-sm font-bold mt-4 text-center bg-red-50 py-2 px-3 rounded-lg border border-red-100"><i className="fas fa-exclamation-circle"></i> {loginError}</div>}
              </div>
              
              <button onClick={handleLogin} disabled={isLoading} className="w-full bg-primary text-white font-bold text-base sm:text-lg py-3.5 rounded-xl hover:bg-gray-900 transition-colors duration-300 shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer">
                {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <>دخول <i className="fas fa-arrow-left"></i></>}
              </button>

              <button 
                onClick={handleInstallClick} 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                style={{ marginTop: '-8px', marginBottom: '-16px' }}
              >
                <i className="fas fa-download text-lg"></i> تثبيت التطبيق على الهاتف أو الكمبيوتر 📱💻
              </button>
              {showInstallBtn && (
                <button 
                  onClick={handleInstallClick} 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  style={{ marginTop: '-8px', marginBottom: '-16px' }}
                >
                  <i className="fas fa-download text-lg"></i> تثبيت التطبيق على الهاتف أو الكمبيوتر 📱💻
                </button>
              )}
              
              <div className="text-center mt-4 text-lg sm:text-xl flex justify-center gap-1.5 w-full">
                <span className={isDarkMode ? "text-gray-100 font-bold" : "text-primary font-bold"} style={{ fontSize: '21px' }}>رؤية وإعداد</span> <span className="text-pink-600 font-black" style={{ fontSize: '23px' }}>أ/ إسلام سعود</span>
              </div>
            </div>
          </div>
          
          {showUnpaidModal && studentData && (
            <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl text-center animate-fade-in flex flex-col">
                <i className="fas fa-hand-holding-usd text-5xl text-red-500 mb-4 block"></i>
                <h2 className="text-2xl font-black text-primary mb-2">تنبيه تأخير السداد</h2>
                
                <p className="text-gray-700 font-bold mb-3 text-base">
                  نعتذر، فإن عليك متأخرات شهر: <span className="text-red-600">({studentData.missingMonths?.join('، ')})</span>
                </p>
                
                <div className="border-2 border-dashed border-gray-300 bg-gray-50 p-3 rounded-xl mb-4">
                  <span className="text-gray-800 font-bold">للسداد إلى رقم:</span><br/>
                  <span className="text-primary font-black text-xl" dir="ltr">01228466613</span>
                </div>
                
                <p className="text-sm font-bold text-gray-500 mb-2">اختر طريقة السداد:</p>
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setUnpaidPaymentMethod('فودافون كاش')} className={`flex-1 p-3 rounded-xl border-2 font-black transition-all ${unpaidPaymentMethod === 'فودافون كاش' ? 'bg-red-50 border-red-500 text-red-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>فودافون كاش</button>
                  <button onClick={() => setUnpaidPaymentMethod('إنستاباي')} className={`flex-1 p-3 rounded-xl border-2 font-black transition-all ${unpaidPaymentMethod === 'إنستاباي' ? 'bg-purple-50 border-purple-500 text-purple-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>إنستاباي</button>
                </div>
                
                <p className="text-sm font-bold text-secondary mb-4">ثم انتظار رد الإدارة للتفعيل.</p>
                
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      if (!unpaidPaymentMethod) { 
                        showAlert('الرجاء اختيار طريقة الدفع (فودافون كاش أو إنستاباي) أولاً.'); 
                        return; 
                      }
                      const whatsappMsg = `السلام عليكم ورحمة الله وبركاته، أ/ إسلام سعود.\nأنا الطالب(ة): ${studentData.name}\nأرغب في سداد متأخرات شهر (${studentData.missingMonths?.join('، ')}) لتفعيل حسابي.\nقمت بالسداد من خلال: ${unpaidPaymentMethod}\n(سأقوم بإرفاق صورة التحويل الآن لتأكيد السداد)`;
                    window.open(`https://wa.me/201228466613?text=${encodeURIComponent(whatsappMsg)}`, '_blank');
                    }} 
                    className="w-full bg-secondary text-white font-black text-lg py-3 rounded-xl shadow-md hover:bg-green-700 transition-colors flex justify-center items-center gap-2"
                  >
                    <i className="fab fa-whatsapp text-xl"></i> إرسال صورة التحويل
                  </button>
                  <button onClick={() => {setShowUnpaidModal(false); setStudentData(null); setUnpaidPaymentMethod('');}} className="w-full bg-gray-200 text-gray-800 font-bold py-3 rounded-xl hover:bg-gray-300 transition-colors">إغلاق وعودة</button>
                </div>
              </div>
            </div>
          )}
          
          {showWelcomeSubscribeModal && (
            <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl text-center animate-fade-in flex flex-col">
                <i className="fas fa-crown text-5xl text-gold mb-4 block drop-shadow-sm"></i>
                <h2 className="text-2xl font-black text-primary mb-2">أهلاً بك يا بطل!</h2>
                <p className="text-gray-700 font-bold mb-6 text-base leading-relaxed">أهلاً بك في منصتك الأولى لضمان الدرجة النهائية.<br/>هل تود الاشتراك معنا؟</p>
                <div className="flex gap-3">
                  <button onClick={() => { setShowWelcomeSubscribeModal(false); setShowRegisterModal(true); }} className="flex-1 bg-secondary text-white font-black text-lg py-3 rounded-xl shadow-md hover:bg-green-700 transition-colors">نعم</button>
                  <button onClick={() => { setShowWelcomeSubscribeModal(false); setInputPhone(''); }} className="flex-1 bg-red-600 text-white font-black text-lg py-3 rounded-xl shadow-md hover:bg-red-700 transition-colors">لا</button>
                </div>
              </div>
            </div>
          )}
          
          {showRegisterModal && (
            <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl text-center animate-fade-in flex flex-col relative max-h-[90dvh] overflow-y-auto custom-scrollbar">
                <i className="fas fa-user-plus text-5xl text-primary mb-4 block"></i>
                <h2 className="text-2xl font-black text-primary mb-2">تسجيل طالب جديد</h2>
                <input 
                  type="text" 
                  placeholder="اسم الطالب رباعي" 
                  className="w-full text-center border-2 border-gray-200 focus:border-primary outline-none py-3 px-4 rounded-xl mb-4 text-sm font-bold" 
                  value={registerName} 
                  onChange={(e) => setRegisterName(e.target.value)} 
                />
                
                <div className="bg-blue-50 border border-blue-100 p-2 rounded-xl mb-3 flex justify-center items-center gap-2">
                  <span className="text-gray-700 font-bold text-sm">قيمة الاشتراك:</span>
                  <span className="text-secondary font-black text-lg">{platformFee} ج.م</span>
                </div>
                
                <div className="border-2 border-dashed border-gray-300 bg-gray-50 p-3 rounded-xl mb-4">
                  <span className="text-gray-800 font-bold">يتم تحويل الاشتراك إلى رقم:</span><br/>
                  <span className="text-primary font-black text-xl" dir="ltr">01228466613</span>
                </div>
                
                <p className="text-sm font-bold text-gray-500 mb-2">أخبرنا بطريقة السداد:</p>
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setRegisterNameMethod('فودافون كاش')} className={`flex-1 p-3 rounded-xl border-2 font-black transition-all ${registerMethod === 'فودافون كاش' ? 'bg-red-50 border-red-500 text-red-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>فودافون كاش</button>
                  <button onClick={() => setRegisterNameMethod('إنستاباي')} className={`flex-1 p-3 rounded-xl border-2 font-black transition-all ${registerMethod === 'إنستاباي' ? 'bg-purple-50 border-purple-500 text-purple-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>إنستاباي</button>
                </div>
                
                <p className="text-sm font-black text-red-600 mb-4">قم بإرفاق وصل السداد</p>
                
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => { 
                      handleRegisterSubmit(); 
                      setShowRegisterModal(false); 
                    }} 
                    className="w-full bg-secondary text-white font-black text-lg py-3 rounded-xl shadow-md hover:bg-green-700 transition-colors flex justify-center items-center gap-2"
                  >
                    <i className="fab fa-whatsapp text-xl"></i> إرسال صورة التحويل
                  </button>
                  <button onClick={() => {setShowRegisterModal(false); setRegisterNameMethod('');}} className="w-full bg-gray-200 text-gray-800 font-bold py-3 rounded-xl hover:bg-gray-300 transition-colors">إلغاء</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }
    
    if (screen === 'index') {
      const isTeacherAdmin = BASE_STUDENTS[formatPhoneStr(inputPhone)]?.role === 'admin';
      return (
        <div className={`h-[100dvh] flex flex-col watermark-container ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className={`shadow-sm px-3 pt-3 md:pt-4 lg:pt-3 pb-2 z-10 border-b-2 flex justify-between items-center gap-2 sm:gap-4 w-full shrink-0 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`} style={{ paddingRight: '13px', paddingBottom: '-5px', paddingTop: '10px', paddingLeft: '10px' }}>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
              <i className="fas fa-graduation-cap text-2xl sm:text-3xl md:text-4xl text-gold shrink-0" style={{ fontSize: '26px', lineHeight: '24px', marginRight: '-9px', borderRadius: '-2px' }}></i>
              <div className="flex flex-col items-start text-right min-w-0 shrink">
                <div className="font-black text-[12px] sm:text-lg md:text-xl lg:text-2xl leading-none whitespace-nowrap">
                  <span className="text-secondary" style={{ marginRight: '-6px', marginLeft: '1px', marginTop: '0px', marginBottom: '2px', lineHeight: '12px', fontSize: '13px', textAlign: 'center', paddingTop: '5px', paddingBottom: '0px', paddingRight: '0px', paddingLeft: '0px' }}>موسوعة </span>
                  <span className={isDarkMode ? 'text-gray-100' : 'text-primary'} style={{ marginTop: '-1px', paddingTop: '5px' }}>الكنز التعليمي</span>
                </div>
                <div className="text-[8px] sm:text-[10px] md:text-xs lg:text-sm font-bold mt-1 flex gap-1 justify-start whitespace-nowrap">
                  <span className={isDarkMode ? "text-gray-200 font-bold" : "text-primary font-bold"} style={{ lineHeight: '19px', marginTop: '3px' }}>رؤية وإعداد</span>
                  <span className="text-pink-600 font-black" style={{ lineHeight: '19px', fontSize: '10px', height: '20px', marginTop: '3px' }}>أ/ إسلام سعود</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-1.5 shrink-0 w-full max-w-[65%] sm:max-w-[55%]">
              <div className="flex items-center gap-1.5 w-full justify-end" style={{ paddingRight: '0px', paddingLeft: '-2px', height: '23px', width: '177.797px' }}>
                {isTeacherAdmin && (
                  <button onClick={() => setScreen('admin')} className="bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] px-1.5 py-0.5 md:py-1 rounded-md text-[8px] md:text-xs lg:text-sm font-black flex items-center gap-1 shadow-sm hover:bg-blue-100 transition-colors shrink-0">
                    إدارة <i className="fas fa-user-shield"></i>
                  </button>
                )}
                <button onClick={toggleFullscreen} className={`w-6 h-6 md:w-8 md:h-8 rounded-md flex items-center justify-center text-[10px] md:text-sm shadow-sm transition-colors shrink-0 border cursor-pointer ${isFullscreen ? 'bg-secondary text-white border-secondary' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`} title="تكبير" style={{ paddingBottom: '0px', paddingRight: '0px', marginRight: '0px', marginBottom: '0px', marginLeft: '3px' }}>
                  <i className={`fas ${isFullscreen?'fa-compress':'fa-expand'}`} style={{ lineHeight: '11px', fontSize: '10px', marginLeft: '-4px', marginRight: '-2px', marginBottom: '-2px', marginTop: '-1px' }}></i>
                </button>
                <button onClick={()=>setIsDarkMode(!isDarkMode)} className={`w-6 h-6 md:w-8 md:h-8 rounded-md flex items-center justify-center text-[10px] md:text-sm shadow-sm transition-colors shrink-0 border cursor-pointer ${isDarkMode ? 'bg-gray-700 text-white border-gray-600 hover:bg-gray-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`} title="ليلي" style={{ marginRight: '-6px', marginLeft: '0px', marginTop: '0px', lineHeight: '12px', fontSize: '11px', textAlign: 'center', paddingTop: '-3px', paddingLeft: '-3px', paddingRight: '-2px', paddingBottom: '-2px', borderColor: '#022366' }}>
                  <i className={`fas ${isDarkMode?'fa-sun':'fa-moon'}`} style={{ marginRight: '0px', marginLeft: '0px', textAlign: 'center' }}></i>
                </button>
                <div className={`px-2 py-0.5 md:py-1 rounded-md text-[8px] sm:text-xs md:text-sm font-black shadow-sm text-center shrink whitespace-nowrap overflow-hidden text-ellipsis border ${isDarkMode ? 'bg-amber-900 text-amber-100 border-amber-600' : 'bg-amber-100 text-amber-800 border-amber-300'}`}>
                  {gradeName}
                </div>
              </div>
              <div className="flex justify-end items-center gap-1.5 w-full overflow-x-auto flex-nowrap custom-scrollbar pb-0.5 mt-0.5">
                <button onClick={handleRefresh} disabled={isLoading} className={`px-2 py-0.5 md:py-1 rounded-md text-[9px] md:text-xs lg:text-sm font-black flex items-center gap-1 shadow-sm transition-colors shrink-0 border ${isDarkMode ? 'bg-blue-900 text-blue-100 border-blue-800 hover:bg-blue-800' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'}`} style={{ marginTop: '0px' }}>
                  تحديث <i className={`fas fa-sync-alt ${isLoading ? 'fa-spin' : ''}`}></i>
                </button>
                
                <button 
                  onClick={() => showConfirm('هل أنت متأكد من مسح جميع إجاباتك والبدء من جديد؟', () => {
                    const completedLessonNames: string[] = [];
                    data.forEach(u => u.lessons.forEach(l => { if(l.completed) completedLessonNames.push(l.title); }));
                    
                    if (completedLessonNames.length > 0) {
                      saveResultToDB({ 
                        quizName: `تصفير 🗑️: ${completedLessonNames.join(' ، ')}`, 
                        score: 'تصفير 🔄' 
                      });
                    }
                    
                    localStorage.removeItem('completedLessons');
                    localStorage.removeItem('userStats');
                    localStorage.removeItem('savedSession');
                    localStorage.removeItem('mistakesBank');
                    setMistakesBank([]);
                    const resetData = data.map(unit => ({ ...unit, lessons: unit.lessons.map(l => ({ ...l, completed: false })) }));
                    setData(resetData); 
                    setActiveFilter('all'); 
                  })} 
                  className="bg-[#fff1f2] text-[#ef4444] border border-[#fecaca] px-2 py-1 rounded-md text-[9px] md:text-xs lg:text-sm font-black flex items-center gap-1 shadow-sm hover:bg-red-50 transition-colors shrink-0"
                  style={{ marginTop: '0px' }}
                >
                  تصفير <i className="fas fa-sync-alt"></i>
                </button>
                <button onClick={handleLogout} className="text-red-500 hover:text-white hover:bg-red-500 bg-red-50 px-2 py-1 rounded-md text-[9px] md:text-xs lg:text-sm font-bold transition-colors border border-red-100 shadow-sm flex items-center gap-1 shrink-0" style={{ marginLeft: '1px', marginTop: '0px' }}>
                  خروج <i className="fas fa-sign-out-alt"></i>
                </button>
              </div>
            </div>
          </div>
          
          <div 
            className="px-3 pt-3 pb-2 z-10 shrink-0 mx-auto w-full max-w-4xl md:px-4" 
            style={isDesktop ? { height: 'auto', width: '100%', marginBottom: '13px', marginTop: '0px' } : { height: '67.2656px', width: '373px', paddingRight: '13px', paddingBottom: '6px', paddingTop: '1px', marginBottom: '13px', marginTop: '0px', paddingLeft: '9px', marginLeft: '0px' }}
          >
            <div 
              className="flex flex-wrap md:flex-nowrap justify-center items-stretch gap-2 w-full max-w-4xl mx-auto" 
              dir="rtl" 
              style={isDesktop ? { fontSize: '15px', lineHeight: '24px' } : { fontSize: '17px', lineHeight: '24px', marginTop: '-13px' }}
            >
              <div 
                className="flex-1 lg:flex-none lg:w-28 bg-primary text-white rounded-xl py-2 px-1 flex flex-col items-center justify-center shadow-md min-w-[65px]" 
                style={isDesktop ? { marginTop: '0px' } : { marginTop: '20px' }}
              >
                <div className="text-[10px] sm:text-xs font-bold text-gray-300 mb-0.5" style={{ height: '18px', marginRight: '-4px', marginLeft: '-5px', marginBottom: '-2px', marginTop: '-2px' }}>التقدم</div>
                <div className="text-sm sm:text-base font-black flex items-center gap-0.5 text-secondary" dir="ltr">
                  <span style={{ borderColor: '#ffffff' }}>%</span><span style={{ borderColor: '#ffffff' }}>{toEasternArabic(stats.progress)}</span>
                </div>
              </div>
              <button 
                onClick={()=>setActiveFilter('all')} 
                className={`flex-1 lg:flex-none lg:w-28 rounded-xl py-2 px-1 flex flex-col items-center justify-center shadow-md transition-all min-w-[65px] ${activeFilter==='all'?'bg-secondary text-white ring-2 ring-offset-1 ring-secondary':'bg-secondary text-white opacity-90'}`} 
                style={isDesktop ? { fontSize: '11px', textAlign: 'center', marginTop: '0px' } : { fontSize: '10px', lineHeight: '13.2857px', textAlign: 'center', marginRight: '-6px', marginTop: '20px' }}
              >
                <div className="text-[10px] sm:text-xs font-bold text-green-100 mb-0.5">الدروس</div>
                <div className="text-sm sm:text-base font-black">{toEasternArabic(stats.total)}</div>
              </button>
              <button 
                onClick={()=>setActiveFilter('completed')} 
                className={`flex-1 lg:flex-none lg:w-28 rounded-xl py-2 px-1 flex flex-col items-center justify-center border shadow-sm transition-all min-w-[65px] ${activeFilter==='completed'?'bg-green-50 border-green-500 ring-1 ring-green-500':'bg-white border-gray-200 hover:border-green-400'}`} 
                style={isDesktop ? { fontSize: '11px', textAlign: 'center', marginTop: '0px' } : { fontSize: '10px', textAlign: 'center', lineHeight: '13.2857px', marginRight: '-5px', marginTop: '20px' }}
              >
                <div className="text-[10px] sm:text-xs font-bold text-green-500 mb-0.5">المنجز</div>
                <div className="text-sm sm:text-base font-black text-green-500">{toEasternArabic(stats.completed)}</div>
              </button>
              <button 
                onClick={()=>setActiveFilter('remaining')} 
                className={`flex-1 lg:flex-none lg:w-28 rounded-xl py-2 px-1 flex flex-col items-center justify-center shadow-md transition-all min-w-[65px] ${activeFilter==='remaining'?'bg-red-600 text-white ring-2 ring-offset-1 ring-red-600':'bg-[#ef4444] text-white hover:bg-red-600'}`} 
                style={isDesktop ? { fontSize: '11px', textAlign: 'center', marginTop: '0px' } : { fontSize: '10px', lineHeight: '13.2857px', marginRight: '-7px', marginTop: '20px' }}
              >
                <div className="text-[10px] sm:text-xs font-bold text-white mb-0.5">المتبقي</div>
                <div className="text-sm sm:text-base font-black text-white">{toEasternArabic(stats.remaining)}</div>
              </button>
              {mistakesBank.length > 0 && (
                <button 
                  onClick={() => {
                    setActiveLesson({ id: 'mistakes_bank', title: 'بنك الأخطاء 🎯', questions: mistakesBank, completed: false });
                    setCurrentQIndex(0);
                    setUserAnswers([]);
                    setScreen('quiz');
                  }} 
                  className="flex-1 lg:flex-none lg:w-28 rounded-xl py-2 px-1 flex flex-col items-center justify-center shadow-md transition-all min-w-[65px] bg-rose-50 border-2 border-rose-500 ring-2 ring-offset-1 ring-rose-500 animate-pulse relative overflow-hidden"
                  style={isDesktop ? {
                    fontSize: '11px',
                    lineHeight: '1.2',
                    marginTop: '0px',
                    borderStyle: 'solid',
                    borderRadius: '11px',
                    fontWeight: 'normal'
                  } : {
                    fontSize: '10px',
                    lineHeight: '9.2857px',
                    marginRight: '-3px',
                    marginBottom: '-4px',
                    paddingBottom: '0px',
                    paddingRight: '4px',
                    paddingTop: '6px',
                    width: '20px',
                    height: '49px',
                    marginTop: '23px',
                    marginLeft: '-5px',
                    paddingLeft: '2px',
                    borderStyle: 'solid',
                    borderRadius: '10px',
                    fontWeight: 'normal'
                  }}
                >
                  <div className="text-[10px] sm:text-xs font-black text-rose-700 mb-0.5 relative z-10">بنك الأخطاء</div>
                  <div className="text-sm sm:text-base font-black text-rose-700 relative z-10">{toEasternArabic(mistakesBank.length)}</div>
                </button>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 pt-0 z-10">
            <div className="max-w-4xl mx-auto space-y-4">
              {announcement && announcement.trim() !== "" && (
                <div className="bg-orange-50 border-r-4 border-gold p-4 rounded-2xl shadow-sm flex items-start gap-3 animate-fade-in mb-2" style={{ fontSize: '11px', lineHeight: '21px', marginBottom: '6px', marginTop: '-5px', paddingLeft: '14px', paddingTop: '9px' }}>
                  <span className="text-gold text-xl shrink-0"><i className="fas fa-bullhorn animate-bounce"></i></span>
                  <div className="flex-1">
                    <h4 className="font-black text-gold text-xs sm:text-sm mb-0.5">تنبيه هام من الأستاذ 📢:</h4>
                    <p className="text-gray-800 text-sm sm:text-base font-bold leading-relaxed whitespace-pre-line" style={{ fontSize: '13px', textAlign: 'justify', lineHeight: '19.5px', height: '69px' }}>{announcement}</p>
                  </div>
                </div>
              )}
              
              {stats.total === 0 ? (
                <div className={`rounded-3xl shadow-md border-2 p-8 text-center animate-fade-in flex flex-col items-center justify-center mt-4 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white'}`}>
                  <i className="fas fa-book-reader text-6xl text-secondary mb-4 opacity-80"></i>
                  <h2 className={`text-2xl font-black mb-2 ${isDarkMode ? 'text-gray-100' : 'text-primary'}`}>مرحباً بك في منصتنا</h2>
                  <p className={`text-lg font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>سيتم إضافة الدروس قريباً</p>
                </div>
              ) : (
                data.map(unit => {
                  if (unit.lessons.length === 0) return null;
                  if (activeFilter !== 'all' && !unit.lessons.some(l => activeFilter === 'completed' ? l.completed : !l.completed)) return null;
                  return (
                    <div key={unit.id} className={`rounded-2xl shadow-lg border overflow-hidden animate-fade-in backdrop-blur-md transition-all ${isDarkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white/60 border-gray-150/50'}`}>
                      <div className={`px-4 py-4 border-b cursor-pointer flex justify-between items-center transition-colors ${isDarkMode ? 'bg-gray-700/40 border-gray-600/40 hover:bg-gray-700/60' : 'bg-gray-50/50 border-gray-200/40 hover:bg-gray-50/70'}`} onClick={() => toggleUnit(unit.id)}>
                        <h2 className={`text-xl font-black ${isDarkMode ? 'text-gray-100' : 'text-primary'}`}>{unit.title}</h2><i className={`fas fa-chevron-${expandedUnits.includes(unit.id) ? 'up' : 'down'} ${isDarkMode ? 'text-gray-300' : ''}`}></i>
                      </div>
                      {(expandedUnits.includes(unit.id) || activeFilter !== 'all') && (
                        <div className={`divide-y backdrop-blur-sm ${isDarkMode ? 'divide-gray-700/50' : 'divide-gray-100/50'}`} style={{ fontSize: '10px' }}>
                          {unit.lessons.filter(l => activeFilter === 'all' || (activeFilter === 'completed' ? l.completed : !l.completed)).map(lesson => (
                            <div 
                              key={lesson.id} 
                              onClick={() => { 
                                if (lesson.audio || lesson.video) {
                                  setLessonModalOptions(lesson);
                                } else {
                                  startQuizForLesson(lesson);
                                }
                              }} 
                              className={`px-6 py-5 flex justify-between items-center cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50/50'}`}
                            >
                              <div className={`font-bold text-lg ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{formatLessonTitleJSX(lesson.title)}</div>
                              {lesson.completed ? <i className="fas fa-check-circle text-secondary text-2xl"></i> : <i className="fas fa-play-circle text-gray-300 text-2xl"></i>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              
              {mapsList && mapsList.length > 0 && (
                <div className="mt-4 mb-8 w-full z-10 shrink-0">
                  <button onClick={() => setScreen('maps')} className={`w-full font-black py-4 rounded-2xl shadow-sm transition-transform active:scale-95 flex justify-center items-center gap-3 border-2 ${isDarkMode ? 'bg-indigo-900 border-indigo-700 text-indigo-100 hover:bg-indigo-800' : 'bg-indigo-50 border-indigo-300 text-indigo-800 hover:bg-indigo-200'}`}>
                    <i className="fas fa-map-marked-alt text-2xl sm:text-3xl animate-bounce"></i> <span className="text-lg sm:text-xl">الخرائط التفاعلية الشاملة</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    
    if (screen === 'maps') {
      return (
        <div className={`h-[100dvh] flex flex-col watermark-container ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className={`shadow-sm px-4 pt-4 pb-3 z-10 border-b-2 flex justify-between items-center w-full shrink-0 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
            <div className="flex items-center gap-3">
              <i className="fas fa-map-marked-alt text-3xl sm:text-4xl text-indigo-500"></i>
              <div className="font-black text-xl sm:text-2xl text-indigo-600">الخرائط التفاعلية</div>
            </div>
            <button onClick={() => { setScreen('index'); setActiveMapUrl(null); }} className="bg-primary text-white font-bold px-5 py-2.5 rounded-xl text-sm sm:text-base shadow-md active:scale-95 transition-transform flex items-center gap-2">
              عودة <i className="fas fa-arrow-left"></i>
            </button>
          </div>
          
          <div className="flex-1 p-4 sm:p-6 z-10 flex flex-col">
            {activeMapUrl ? (
              <div className="w-full h-full relative rounded-3xl overflow-hidden border-4 border-indigo-200 shadow-2xl bg-white flex flex-col animate-fade-in">
                <div className="bg-indigo-100 px-4 py-2 flex justify-between items-center border-b border-indigo-200">
                  <span className="font-bold text-indigo-800"><i className="fas fa-info-circle ml-1"></i> تفاعل مع الخريطة</span>
                  <button onClick={() => setActiveMapUrl(null)} className="bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow font-black text-lg hover:bg-red-600 transition-colors">×</button>
                </div>
                <iframe src={activeMapUrl} className="flex-1 w-full border-0 bg-white" title="Interactive Map"></iframe>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4 animate-fade-in">
                {mapsList && mapsList.map(map => (
                  <div key={map.id} onClick={() => setActiveMapUrl(map.url)} className={`p-8 rounded-3xl shadow-lg border-2 cursor-pointer transition-transform hover:-translate-y-2 flex flex-col items-center text-center relative overflow-hidden group ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-indigo-500' : 'bg-white border-gray-100 hover:border-indigo-400'}`}>
                    <div className="absolute top-0 right-0 w-full h-2 bg-indigo-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-right"></div>
                    <i className="fas fa-map-location-dot text-6xl text-indigo-200 group-hover:text-indigo-500 transition-colors mb-4 block"></i>
                    <h3 className={`text-xl font-black mt-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>{map.title}</h3>
                    <span className="mt-4 text-sm font-bold bg-indigo-50 text-indigo-600 py-1 px-4 rounded-full border border-indigo-100">فتح الخريطة</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }
    
    if (screen === 'quiz' && activeLesson && question) {
      const handleOptionClick = (option: string) => {
        if (isAnswered) return;
        const isCorrect = option === question!.correct;
        const newAns = [...userAnswers]; 
        newAns[currentQIndex] = { 
          isCorrect, 
          selected: option, 
          concept: question!.concept, 
          paragraph: question!.paragraph, 
          type: 'mcq' 
        }; 
        setUserAnswers(newAns);
        
        // Show temporary feedback toast for MCQ questions (lasting ~1 second)
        if (isCorrect) {
          setFeedbackToast({ isCorrect: true, message: '👍' });
        } else {
          setFeedbackToast({ isCorrect: false, message: '😔' });
        }
        setTimeout(() => {
          setFeedbackToast(null);
        }, 1100);
        
        setMistakesBank(prev => {
          const newBank = [...prev];
          const qHash = simpleHash(question!.q);
          const existsIndex = newBank.findIndex(item => simpleHash(item.q) === qHash);
          
          if (!isCorrect && existsIndex === -1) {
            newBank.push(question!); 
          } else if (isCorrect && existsIndex !== -1) {
            newBank.splice(existsIndex, 1); 
          }
          localStorage.setItem('mistakesBank', JSON.stringify(newBank));
          return newBank;
        });
      };
      
      const handleEssayReveal = () => {
        if (isAnswered) return;
        const newAns = [...userAnswers]; 
        newAns[currentQIndex] = { 
          isCorrect: true, 
          concept: question!.concept, 
          paragraph: question!.paragraph, 
          type: 'essay' 
        }; 
        setUserAnswers(newAns);
      };
      
      return (
        <div className={`h-[100dvh] flex flex-col watermark-container relative ${isDarkMode?'bg-gray-900':''}`} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          <DrawingCanvas isEnabled={isDrawingMode} />
          
          <div className={`shadow-md px-2 sm:px-4 pt-3 md:pt-4 lg:pt-3 pb-2 flex justify-between items-center gap-1 z-50 sticky top-0 shrink-0 w-full border-b-4 border-primary ${isDarkMode?'bg-gray-800':'bg-white'}`}>
            <div className="flex items-center gap-1 min-w-0 shrink">
              <i className={`fas fa-graduation-cap text-lg sm:text-2xl md:text-3xl lg:text-4xl shrink-0 ${isDarkMode?'text-gray-100':'text-gold'}`}></i>
              <div className="flex flex-col items-center text-center min-w-0 shrink">
                <div className="flex items-center gap-1 font-black text-[11px] sm:text-sm md:text-lg lg:text-xl leading-none mb-0.5 whitespace-nowrap">
                  <span className={isDarkMode?'text-secondary':'text-secondary'}>موسوعة</span>
                  <span className={isDarkMode?'text-gray-100':'text-primary'}>الكنز التعليمي</span>
                </div>
                <div className="text-[7px] sm:text-[9px] md:text-xs lg:text-sm font-bold flex gap-1 justify-center whitespace-nowrap">
                  <span className={isDarkMode ? "text-gray-200 font-bold" : "text-primary font-bold"}>رؤية وإعداد</span>
                  <span className="text-pink-600 font-black">أ/ إسلام سعود</span>
                </div>
              </div>
            </div>
            
            <div className={`flex items-center justify-center px-2 py-1 rounded-full shadow-inner border shrink-0 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'}`}>
              <div className={`font-black text-[10px] sm:text-sm md:text-lg lg:text-xl flex items-center gap-0.5 ${isDarkMode ? 'text-gray-300' : 'text-primary'}`} dir="ltr">
                <span className="text-secondary">{toEasternArabic(currentQIndex + 1)}</span>
                <span className="opacity-50">/</span>
                <span>{toEasternArabic(totalQs)}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1 shrink-0 justify-end flex-nowrap overflow-x-auto custom-scrollbar pb-0.5 max-w-[45%]">
              <button onClick={toggleFullscreen} className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-[10px] md:text-sm shrink-0 transition-colors ${isFullscreen?'bg-secondary text-white':'bg-gray-100 text-primary hover:bg-gray-200'}`}><i className={`fas ${isFullscreen?'fa-compress':'fa-expand'}`}></i></button>
              <button onClick={()=>setIsDrawingMode(!isDrawingMode)} className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-[10px] md:text-sm shrink-0 transition-colors ${isDrawingMode?'bg-secondary text-white':'bg-gray-100 text-primary hover:bg-gray-200'}`}><i className="fas fa-pen"></i></button>
              <button onClick={()=>setIsDarkMode(!isDarkMode)} className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-[10px] md:text-sm shrink-0 transition-colors ${isDarkMode?'bg-secondary text-white':'bg-gray-100 text-primary hover:bg-gray-200'}`}><i className={`fas ${isDarkMode?'fa-sun':'fa-moon'}`}></i></button>
              <button onClick={()=>showConfirm('هل أنت متأكد من مغادرة الاختبار؟\nسيتم حفظ تقدمك الحالي.', () => setScreen('index'))} className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-red-50 flex items-center justify-center text-[10px] md:text-sm shrink-0 text-red-600 hover:bg-red-500 hover:text-white transition-colors"><i className="fas fa-home"></i></button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 pb-28 z-10 flex flex-col pt-8">
            <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col mt-4">
              <div className={`rounded-3xl shadow-lg p-6 mb-8 relative border-2 mt-10 transition-all ${isDarkMode ? 'bg-gray-800 border-slate-500' : 'bg-[#fefee5] border-yellow-200/60'}`}>
                <div className="absolute -top-4 right-8 bg-secondary text-white font-bold px-4 py-1 rounded-full shadow">سؤال {toEasternArabic(currentQIndex+1)}</div>
                <h2 className={`text-xl sm:text-2xl font-bold mt-2 leading-relaxed ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                  <FormatQuestionText text={question.q} concept={question.concept} isDarkMode={isDarkMode} />
                </h2>
              </div>
              
              {question.type === 'mcq' && (
                <div className="flex flex-col gap-4 mb-8">
                  {question.options.map((opt, idx) => {
                    let btnClass = isDarkMode
                      ? "bg-slate-800/80 border-2 border-slate-500 text-gray-100 p-4 rounded-2xl font-bold text-xl flex items-center shadow-sm cursor-pointer transition-all active:scale-95 hover:border-blue-400 hover:bg-slate-800"
                      : "bg-[#ebf5ff] border-2 border-[#bcccf0]/70 text-primary p-4 rounded-2xl font-bold text-xl flex items-center shadow-sm cursor-pointer transition-all active:scale-95 hover:border-blue-400 hover:bg-[#e1f0fe]";
                    if (isAnswered && currentAnswer) {
                      if (opt === question!.correct) {
                        btnClass = isDarkMode 
                          ? "bg-green-950/40 border-green-500 text-green-200 p-4 rounded-2xl font-bold text-xl flex items-center shadow-md border-2"
                          : "bg-green-50 border-green-500 text-green-800 p-4 rounded-2xl font-bold text-xl flex items-center shadow-md border-2";
                      } else if (currentAnswer.selected === opt) {
                        btnClass = isDarkMode
                          ? "bg-red-950/40 border-red-500 text-red-200 p-4 rounded-2xl font-bold text-xl flex items-center shadow-md border-2"
                          : "bg-red-50 border-red-500 text-red-800 p-4 rounded-2xl font-bold text-xl flex items-center shadow-md border-2";
                      } else {
                        btnClass = isDarkMode
                          ? "bg-gray-800/40 border-slate-700 text-gray-400 p-4 rounded-2xl font-bold text-xl flex items-center opacity-30 border-2"
                          : "bg-gray-50 border-gray-150 p-4 rounded-2xl font-bold text-xl flex items-center opacity-50 border-2";
                      }
                    }
                    return (
                      <button 
                        key={idx} 
                        onClick={()=>handleOptionClick(opt)} 
                        className={btnClass} 
                        disabled={isAnswered}
                      >
                        <span 
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ml-4 shrink-0 transition-all ${
                            isAnswered && currentAnswer 
                              ? (opt === question!.correct 
                                  ? 'bg-green-500 text-white shadow-md' 
                                  : (currentAnswer.selected === opt 
                                      ? 'bg-red-500 text-white shadow-md' 
                                      : (isDarkMode 
                                          ? 'bg-gray-700 text-gray-300 opacity-50' 
                                          : 'bg-gray-100 text-gray-700 opacity-60')))
                              : 'bg-[#074ba3] text-white'
                          }`}
                          style={{
                            borderStyle: 'solid',
                            borderWidth: '1px',
                            borderColor: '#844d06',
                          }}
                        >
                          {['أ','ب','ج','د'][idx]}
                        </span>
                        <span className="text-right leading-relaxed whitespace-pre-line">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              
              {question.type === 'essay' && (
                <div className="mb-8 w-full text-center">
                  {!isAnswered ? (
                    <button onClick={handleEssayReveal} className="bg-primary text-white font-bold text-2xl py-6 px-12 rounded-2xl w-full max-w-lg shadow-lg active:scale-95 transition-transform">
                      الإجابة <i className="fas fa-eye ml-2"></i>
                    </button>
                  ) : (
                    <div className={`rounded-3xl p-6 border-r-8 border-green-500 text-right shadow-sm ${isDarkMode ? 'bg-green-950/20 text-gray-100' : 'bg-green-50'}`}>
                      <h3 className={`text-2xl font-black underline underline-offset-4 mb-4 ${isDarkMode ? 'text-red-400 decoration-red-400' : 'text-red-600 decoration-red-600'}`}>الإجابة:</h3>
                      <div className="text-xl font-bold leading-relaxed">
                        <HighlightText text={question.answer} concept={question.concept} isDarkMode={isDarkMode} />
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {isAnswered && currentAnswer && question.type === 'mcq' && question.reason && (
                <div className={`mt-4 rounded-3xl p-6 shadow-md border-r-8 ${
                  isDarkMode 
                    ? (currentAnswer.isCorrect ? 'bg-green-950/20 border-green-500 text-gray-100' : 'bg-red-950/20 border-red-500 text-gray-100')
                    : (currentAnswer.isCorrect ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500')
                }`}>
                  <h3 className={`text-xl font-black underline underline-offset-4 mb-2 ${isDarkMode ? 'text-red-400 decoration-red-400' : 'text-red-600 decoration-red-600'}`}>التعليل:</h3>
                  <div className="text-xl font-bold leading-relaxed">
                    <HighlightText text={question.reason} concept={question.concept} isDarkMode={isDarkMode} />
                  </div>
                </div>
              )}
              
              <div className="mt-auto pt-8 flex justify-between items-center bg-transparent z-10">
                <button 
                  onClick={()=>setCurrentQIndex(currentQIndex-1)} 
                  disabled={currentQIndex===0} 
                  className={`font-black text-xl py-3 px-8 rounded-2xl transition-transform active:scale-95 ${currentQIndex===0?'opacity-0':'bg-secondary text-white shadow-md'}`}
                >
                  السابق
                </button>
                {isAnswered && (
                  <button 
                    onClick={()=>currentQIndex<totalQs-1?setCurrentQIndex(currentQIndex+1):handleFinishQuiz()} 
                    className={`text-white font-black text-xl py-3 px-8 rounded-2xl shadow-md transition-transform active:scale-95 ${currentQIndex===totalQs-1?'bg-red-500':'bg-secondary'}`}
                  >
                    {currentQIndex===totalQs-1?'إنهاء':'التالي'} <i className="fas fa-arrow-left"></i>
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Feedback Toast Overlay */}
          <AnimatePresence>
            {feedbackToast && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 z-[99999] flex items-center justify-center backdrop-blur-xs"
              >
                <motion.div 
                  initial={{ scale: 0.4, rotate: -10, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1, transition: { type: 'spring', damping: 12 } }}
                  exit={{ scale: 0.6, rotate: 10, opacity: 0, transition: { duration: 0.2 } }}
                  className={`px-8 py-6 rounded-3xl flex flex-col items-center justify-center gap-2 shadow-[0_25px_60px_rgba(0,0,0,0.5)] border-4 transition-all ${
                    feedbackToast.isCorrect 
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800' 
                      : 'bg-rose-50 border-rose-500 text-rose-800'
                  }`}
                >
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center text-[2.75rem] shadow-sm border-2 ${
                    feedbackToast.isCorrect 
                      ? 'bg-emerald-500 text-white border-emerald-600 animate-bounce' 
                      : 'bg-rose-500 text-white border-rose-600'
                  }`}>
                    {feedbackToast.isCorrect ? '👍' : '😔'}
                  </div>
                  <span className="text-2xl font-black mt-1 select-none tracking-wide text-center">
                    {feedbackToast.isCorrect ? 'عاش 💪' : 'ركز'}
                  </span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }
    
    if (screen === 'result' && activeLesson) {
      const totalQs = activeLesson.questions.length; 
      const correct = userAnswers.filter(a => a.isCorrect).length; 
      const perc = Math.round((correct/totalQs)*100);
      const wrongConcepts = [...new Set(userAnswers.filter(a => !a.isCorrect).map(a => a.paragraph || a.concept || 'مراجعة عامة'))];
      const firstName = studentName ? studentName.split(' ')[0] : 'يا بطل';
      
      return (
        <div className="h-[100dvh] w-full flex items-center justify-center p-6 bg-gray-50 overflow-y-auto watermark-container">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 md:p-10 text-center border-t-8 border-primary my-auto animate-fade-in flex flex-col items-center">
            <i className={`fas ${perc===100?'fa-trophy text-gold':perc>=75?'fa-medal text-blue-500':'fa-book-open text-secondary'} text-7xl md:text-8xl mb-4 block`}></i>
            <div className="text-5xl md:text-6xl font-black text-primary mb-6 flex justify-center items-center gap-1" dir="ltr"><span>{toEasternArabic(perc)}</span><span>%</span></div>
            <div className="w-full mb-8">
              {perc === 100 && (
                <div className="space-y-4">
                  <p className="text-xl md:text-2xl font-bold text-gray-800 leading-loose"><span className="text-pink-600 font-black">عاش يا بطل!</span> لقد اجتزت (<span className="text-secondary font-black">{activeLesson.title}</span>) بنجاح.</p>
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-sm inline-block w-full"><p className="text-lg font-black text-blue-800"><span className="text-pink-600">أ/ إسلام سعود:</span> {firstName}، أنا فخور بك!</p></div>
                </div>
              )}
              {perc >= 75 && perc < 100 && (
                <div className="space-y-4">
                  <p className="text-xl md:text-2xl font-bold text-gray-800 leading-loose"><span className="text-pink-600 font-black">عاش يا بطل!</span> لقد اجتزت (<span className="text-secondary font-black">{activeLesson.title}</span>) بنجاح.<span className="text-gray-600 mt-2 block text-lg">ولكن لضمان التقفيل، راجع هذه الأجزاء السريعة:</span><span className="text-primary block mt-1 font-black text-lg">({wrongConcepts.join('، ')})</span></p>
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-sm inline-block w-full"><p className="text-lg font-black text-blue-800"><span className="text-pink-600">أ/ إسلام سعود:</span> {firstName}، أنا فخور بك!</p></div>
                </div>
              )}
              {perc < 75 && (
                <div className="space-y-4">
                  <p className="text-xl md:text-2xl font-bold text-gray-800 leading-loose"><span className="text-red-500 block mb-1">هناك أجزاء تحتاج تركيز:</span><span className="text-primary font-black block text-lg">({wrongConcepts.join('، ')})</span></p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 shadow-sm inline-block w-full"><p className="text-base md:text-lg font-black text-yellow-800"><span className="text-pink-600">أ/ إسلام سعود:</span> {firstName}، لا تنسَ مراجعة ما سبق، في كل الأحوال سوف أكون فخور بك بإذن الله ❤️</p></div>
                </div>
              )}
            </div>
            <div className="w-full flex flex-col gap-3">
              <button 
                onClick={()=>{
                  if (activeLesson.id !== 'mistakes_bank') {
                    const newCompleted = JSON.parse(localStorage.getItem('completedLessons') || '[]');
                    if (!newCompleted.includes(activeLesson.id)) {
                      newCompleted.push(activeLesson.id);
                      localStorage.setItem('completedLessons', JSON.stringify(newCompleted));
                    }
                    setData(data.map(u=>({...u,lessons:u.lessons.map(l=>l.id===activeLesson.id?{...l,completed:true}:l)}))); 
                  }
                  setScreen('index');
                }} 
                className="bg-primary text-white font-black text-xl md:text-2xl py-4 px-10 rounded-full w-full hover:bg-gray-900 transition-colors shadow-lg active:scale-95"
              >
                العودة للفهرس
              </button>
              
              {perc < 100 && (
                <button 
                  onClick={()=>{
                    const wrongQs = activeLesson.questions.filter((q, idx) => userAnswers[idx] && !userAnswers[idx].isCorrect);
                    const newLesson = { ...activeLesson, questions: wrongQs };
                    setData(data.map(u=>({...u,lessons:u.lessons.map(l=>l.id===activeLesson.id?newLesson:l)})));
                    setActiveLesson(newLesson);
                    setUserAnswers([]);
                    setCurrentQIndex(0);
                    setScreen('quiz');
                  }} 
                  className="bg-rose-500 text-white font-black text-xl md:text-2xl py-4 px-10 rounded-full w-full hover:bg-rose-700 transition-colors shadow-lg active:scale-95 border-2 border-rose-600"
                >
                  إعادة اختبار الأخطاء فقط <i className="fas fa-redo-alt ml-2"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }
    
    if (screen === 'admin') {
      return (
        <div className="h-[100dvh] w-full flex flex-col bg-gray-50 watermark-container">
          <div className="bg-primary text-white px-4 pt-3 md:pt-4 lg:pt-3 pb-3 flex justify-between items-center z-10 border-b-4 border-gold flex-wrap gap-y-3 shadow-md shrink-0">
            <div className="flex items-center gap-3 shrink-0 justify-start">
              <i className="fas fa-graduation-cap text-2xl sm:text-3xl md:text-4xl text-gold shrink-0"></i>
              <div className="flex flex-col items-start text-right">
                <div className="flex items-center gap-1 font-black text-xl sm:text-2xl leading-none mb-1"><span className="text-gold">موسوعة</span><span className="text-white">الكنز التعليمي</span></div>
                <div className="text-[10px] sm:text-xs font-bold flex gap-1"><span className="text-gray-300">الإدارة</span></div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setScreen('index')} className="bg-blue-600 text-white font-bold px-3 py-1.5 rounded-lg text-sm hover:bg-blue-500 transition-colors shadow"><i className="fas fa-book-reader"></i> طالب</button>
              <button onClick={fetchAdminData} className="bg-secondary text-white font-bold px-3 py-1.5 rounded-lg text-sm hover:bg-green-500 transition-colors shadow"><i className="fas fa-sync-alt"></i> تحديث</button>
              <button onClick={() => { setInputPhone(''); setInputPassword(''); setShowPasswordInput(false); setScreen('home'); }} className="bg-red-600 text-white font-bold px-3 py-1.5 rounded-lg text-sm hover:bg-red-500 transition-colors shadow"><i className="fas fa-sign-out-alt"></i> خروج</button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 z-10 flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-64 shrink-0 bg-white rounded-2xl shadow-md p-3 flex flex-row md:flex-col overflow-x-auto custom-scrollbar gap-2">
              <button onClick={() => setAdminActiveTab('results')} className={`px-4 py-3 rounded-xl font-bold text-sm whitespace-nowrap text-right transition-colors ${adminActiveTab==='results'?'bg-primary text-white':'text-gray-600 hover:bg-gray-100'}`}>النتائج (أ - ي)</button>
              <button onClick={() => setAdminActiveTab('requests')} className={`px-4 py-3 rounded-xl font-bold text-sm whitespace-nowrap text-right relative transition-colors ${adminActiveTab==='requests'?'bg-primary text-white':'text-gray-600 hover:bg-gray-100'}`}>الطلبات {adminPendingReqs.length>0&&<span className="absolute top-2 left-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{adminPendingReqs.length}</span>}</button>
              <button onClick={() => setAdminActiveTab('search')} className={`px-4 py-3 rounded-xl font-bold text-sm whitespace-nowrap text-right transition-colors ${adminActiveTab==='search'?'bg-primary text-white':'text-gray-600 hover:bg-gray-100'}`}>الاشتراكات</button>
              <button onClick={() => setAdminActiveTab('settings')} className={`px-4 py-3 rounded-xl font-bold text-sm whitespace-nowrap text-right transition-colors ${adminActiveTab==='settings'?'bg-primary text-white':'text-gray-600 hover:bg-gray-100'}`}>الإعدادات</button>
            </div>
            
            <div className="flex-1 w-full space-y-6 min-w-0">
              {adminActiveTab === 'results' && (
                <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200"><h2 className="text-xl font-black text-primary">نتائج الطلاب</h2></div>
                  <div className="p-4 space-y-2">
                    {adminResults.map((student, i) => (
                      <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                        <div onClick={() => setExpandedAdminStudent(expandedAdminStudent === student.name ? null : student.name)} className="bg-gray-50 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors">
                          <div className="flex flex-col"><span className="font-black text-lg text-primary">{student.name}</span><span className="text-sm font-bold text-gray-500" dir="ltr">{student.phone}</span></div>
                          <div className="flex items-center gap-3"><span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-lg">{student.tests.length} اختبارات</span><i className={`fas fa-chevron-${expandedAdminStudent === student.name ? 'up' : 'down'} text-gray-400`}></i></div>
                        </div>
                        {expandedAdminStudent === student.name && (
                          <div className="divide-y divide-gray-100">
                            {student.tests.map((test, tIdx) => {
                              const isGood = parseInt(test.score) >= 75;
                              return (
                                <div key={tIdx} className="px-4 py-3 flex justify-between items-center bg-white">
                                  <div className="flex flex-col"><span className="font-bold text-gray-800">{test.quiz}</span><span className="text-xs text-gray-400">{test.date}</span></div>
                                  <span className={`${isGood ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} px-3 py-1 rounded-lg font-black text-sm`}>{test.score}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                    {adminResults.length === 0 && <div className="text-center text-gray-500 font-bold py-8">لا توجد نتائج مسجلة حتى الآن.</div>}
                  </div>
                </div>
              )}
              {adminActiveTab === 'requests' && (
                <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200"><h2 className="text-xl font-black text-primary">طلبات التسجيل</h2></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right"><thead className="bg-gray-100 text-gray-600"><tr><th className="p-4">التاريخ</th><th className="p-4">الاسم</th><th className="p-4">الرقم</th><th className="p-4">الدفع</th><th className="p-4 text-center">الإجراء</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {adminPendingReqs.map((req, i) => (<tr key={i}><td className="p-4 text-sm">{req.date}</td><td className="p-4 font-black">{req.name}</td><td className="p-4 font-bold" dir="ltr">{req.phone}</td><td className="p-4">{req.method}</td><td className="p-4 text-center"><div className="flex gap-2 justify-center"><button onClick={()=>handleApproveSubscription(req.phone, req.name)} className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm shadow">موافقة</button><button onClick={()=>handleRejectSubscription(req.phone, req.name)} className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm shadow">رفض</button></div></td></tr>))}
                      {adminPendingReqs.length === 0 && <tr><td colSpan={5} className="text-center p-8 font-bold text-gray-500">لا توجد طلبات معلقة.</td></tr>}
                    </tbody></table>
                  </div>
                </div>
              )}
              {adminActiveTab === 'search' && (
                <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4"><h2 className="text-xl font-black text-primary">تفعيل المتأخرات</h2><input type="text" placeholder="بحث بالاسم أو الرقم..." className="border-2 rounded-xl px-4 py-2 w-full sm:w-64 focus:border-primary outline-none" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} /></div>
                  <div className="p-6 space-y-3">
                    {(() => {
                      const list: React.ReactNode[] = [];
                      Object.entries(studentsList).forEach(([phone, arr]) => {
                        const students = Array.isArray(arr) ? arr : [arr];
                        students.forEach((st, i) => {
                          if (searchQuery && !st.name.includes(searchQuery) && !phone.includes(searchQuery)) return;
                          if (st.isPaid || !st.missingMonths || st.missingMonths.length === 0) return;
                          
                          list.push(
                            <div key={`${phone}-${i}`} className="bg-red-50 border border-red-100 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4">
                              <div>
                                <div className="font-black text-lg text-red-800">{st.name}</div>
                                <div className="font-bold text-red-400" dir="ltr">{phone}</div>
                              </div>
                              <div className="flex flex-wrap gap-2 justify-center">
                                {st.missingMonths.map((m, mIdx) => (
                                  <button 
                                    key={mIdx} 
                                    onClick={() => handleActivateMonth(phone, st.name, m)} 
                                    className="bg-white border-2 border-red-500 text-red-600 font-bold px-3 py-1 rounded-lg text-sm hover:bg-red-500 hover:text-white transition-colors"
                                  >
                                    تفعيل {m}
                                  </button>
                                ))}
                                <button 
                                  onClick={() => { 
                                    const msg = `${st.name} : لقد تم تفعيلكم في منصة موسوعة الكنز\nتمنياتي بالتوفيق\n*أ/إسلام سعود*`; 
                                    window.open(`https://wa.me/20${formatPhoneStr(phone).substring(1)}?text=${encodeURIComponent(msg)}`, '_blank'); 
                                  }} 
                                  className="bg-green-500 text-white font-bold px-3 py-1 rounded-lg text-sm shadow hover:bg-green-600 transition-colors flex items-center gap-1"
                                >
                                  <i className="fab fa-whatsapp"></i> رسالة
                                </button>
                              </div>
                            </div>
                          );
                        });
                      });
                      return list.length > 0 ? list : <div className="text-center text-gray-500 font-bold py-6">لا توجد اشتراكات متأخرة مطابقة.</div>;
                    })()}
                  </div>
                </div>
              )}
              {adminActiveTab === 'settings' && (
                <div className="bg-white rounded-2xl shadow-md overflow-hidden max-w-lg">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200"><h2 className="text-xl font-black text-primary">إعدادات المنصة</h2></div>
                  <div className="p-6">
                    <div className="mb-4">
                      <label className="block text-gray-700 font-bold mb-2">قيمة الاشتراك الحالية:</label>
                      <div className="bg-gray-100 px-4 py-3 rounded-xl font-black text-secondary text-lg border">{platformFee}</div>
                    </div>
                    <div className="mb-6">
                      <label className="block text-gray-700 font-bold mb-2">تحديث السعر:</label>
                      <input type="text" placeholder="مثال: 60 جنيهاً" className="w-full border-2 focus:border-secondary outline-none rounded-xl px-4 py-3 text-lg font-bold" value={newFeeInput} onChange={e=>setNewFeeInput(e.target.value)} />
                    </div>
                    
                    <div className="mb-6">
                      <label className="block text-gray-700 font-bold mb-2">الإشعار الحالي للطلاب 📢:</label>
                      <textarea 
                        placeholder="اكتب التنبيه هنا ليظهر لجميع الطلاب فوراً في أعلى الفهرس..." 
                        className="w-full border-2 focus:border-secondary outline-none rounded-xl px-4 py-3 text-base font-bold h-28 resize-none text-right" 
                        value={announcementInput} 
                        onChange={e=>setAnnouncementInput(e.target.value)} 
                      />
                      <p className="text-xs text-gray-500 mt-1 font-bold">امسح نص الإشعار بالكامل واضغط حفظ الإعدادات لإخفاء الإشعار من واجهة الطلاب.</p>
                    </div>
                    
                    <button onClick={handleUpdateFee} className="w-full text-white font-bold py-3 rounded-xl shadow transition-colors bg-primary hover:bg-blue-800">حفظ الإعدادات</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };
  
  return (
    <React.Fragment>
      {renderScreen()}
      
      {lessonModalOptions && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl text-center animate-fade-in flex flex-col relative max-h-[90dvh] overflow-y-auto custom-scrollbar">
            <div className="absolute top-0 right-0 w-full h-2 bg-secondary"></div>
            
            <h2 className="text-xl md:text-2xl font-black text-primary mb-6 mt-2">{formatLessonTitleJSX(lessonModalOptions.title)}</h2>
            
            {lessonModalOptions.video && (
              <div className="mb-4 w-full rounded-2xl overflow-hidden shadow-sm border border-gray-200 relative flex items-center justify-center" style={lessonModalOptions.video.startsWith('http') ? { paddingTop: '56.25%', backgroundColor: 'black' } : { minHeight: '120px', backgroundColor: '#f3f4f6' }}>
                {lessonModalOptions.video.startsWith('http') ? (
                  <iframe 
                    className="absolute top-0 left-0 w-full h-full"
                    src={getYoutubeEmbedLink(lessonModalOptions.video)} 
                    title="YouTube video" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen>
                  </iframe>
                ) : (
                  <div className="flex flex-col items-center justify-center p-4">
                    <i className="fas fa-video-slash text-4xl text-gray-400 mb-2"></i>
                    <span className="font-black text-rose-600 text-lg">{lessonModalOptions.video}</span>
                  </div>
                )}
              </div>
            )}
            
            {lessonModalOptions.audio && (
              <div className="bg-blue-50 border-2 border-blue-100 dark:bg-gray-800/10 dark:border-gray-800 rounded-2xl p-4 mb-4" dir="rtl">
                <p className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center justify-center gap-2">
                  <i className="fas fa-headphones-alt text-xl"></i> الاستماع للشرح:
                </p>
                {lessonModalOptions.audio.startsWith('http') ? (
                  <div className="text-center space-y-2">
                    {globalAudio && globalAudio.url === lessonModalOptions.audio ? (
                      <div className="space-y-3 bg-white dark:bg-gray-900 border border-blue-100 dark:border-gray-800 rounded-xl p-3 shadow-sm">
                        <div className="flex items-center justify-center gap-3">
                          <button 
                            onClick={toggleGlobalAudio} 
                            className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center text-lg transition-transform active:scale-95 shadow-md cursor-pointer"
                            title={isGlobalAudioPlaying ? "إيقاف مؤقت" : "تشغيل"}
                          >
                            <i className={`fas ${isGlobalAudioPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                          </button>
                          
                          <div className="text-right flex-1 min-w-0">
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-bold">يتم تشغيل الشرح الصوتي 🎧</p>
                          </div>
                        </div>

                        {/* Progress slider synced globally */}
                        <div className="space-y-1">
                          <input 
                            type="range" 
                            min={0} 
                            max={globalAudioDuration || 100} 
                            value={globalAudioTime} 
                            onChange={handleGlobalAudioSeek} 
                            className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                          <div className="flex justify-between text-[10px] text-gray-500 font-bold" dir="ltr">
                            <span>{formatAudioTime(globalAudioTime)}</span>
                            <span>{formatAudioTime(globalAudioDuration)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => playLessonAudio(lessonModalOptions.audio!, lessonModalOptions.title)}
                        className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer text-base"
                      >
                        <i className="fas fa-play-circle text-xl animate-pulse"></i>
                        تشغيل الشرح الصوتي والاستماع في الخلفية
                      </button>
                    )}

                    {/* Google Drive external fallback link */}
                    <a 
                      href={getDriveDirectLink(lessonModalOptions.audio)} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer text-sm"
                    >
                      <i className="fas fa-external-link-alt text-xs"></i>
                      فتح الصوت في متصفح خارجي (إذا لم يعمل) 🌐
                    </a>
                  </div>
                ) : (
                  <div className="bg-white border border-blue-200 rounded-xl py-3 px-4 text-center shadow-sm">
                    <span className="font-black text-rose-600 text-lg">{lessonModalOptions.audio}</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex flex-col gap-3 mt-2 mt-auto">
              <button onClick={() => startQuizForLesson(lessonModalOptions)} className="w-full bg-primary text-white font-black text-lg py-3 rounded-xl shadow-md hover:bg-gray-900 transition-colors flex justify-center items-center gap-2">
                <i className="fas fa-pen-alt"></i> الدخول للتدريبات
              </button>
              <button onClick={() => setLessonModalOptions(null)} className="w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">
                إغلاق وعودة
              </button>
            </div>
          </div>
        </div>
      )}
      
      {dialog.isOpen && (
        <div className="fixed inset-0 bg-black/70 z-[999] flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl text-center animate-fade-in">
            <i className={`fas ${dialog.type === 'confirm' ? 'fa-question-circle text-primary' : 'fa-info-circle text-secondary'} text-5xl mb-4 block`}></i>
            <h2 className="text-xl font-black text-gray-800 mb-6 whitespace-pre-line leading-relaxed">{dialog.message}</h2>
            <div className="flex gap-3">
              {dialog.type === 'confirm' ? (
                <React.Fragment>
                  <button onClick={() => { if(dialog.onConfirm) dialog.onConfirm(); closeDialog(); }} className="flex-1 bg-secondary text-white font-black text-lg py-3 rounded-xl hover:bg-green-700 transition-colors">تأكيد</button>
                  <button onClick={closeDialog} className="flex-1 bg-gray-200 text-gray-800 font-black text-lg py-3 rounded-xl hover:bg-gray-300 transition-colors">إلغاء</button>
                </React.Fragment>
              ) : (
                <button onClick={closeDialog} className="w-full bg-primary text-white font-black text-lg py-3 rounded-xl hover:bg-gray-900 transition-colors">حسناً</button>
              )}
            </div>
          </div>
        </div>
      )}

      {showIOSInstallGuide && (
        <div className="fixed inset-0 bg-black/80 z-[1000] flex items-center justify-center p-4 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center">
            <button 
              onClick={() => setShowIOSInstallGuide(false)} 
              className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <i className="fas fa-times-circle text-2xl"></i>
            </button>
            <i className="fas fa-download text-5xl text-emerald-600 mb-3 block animate-bounce"></i>
            <h2 className="text-xl sm:text-2xl font-black text-primary mb-3">دليلك لتثبيت التطبيق 📱💻</h2>
            
            {/* Tabs Selector */}
            <div className="bg-gray-100 p-1.5 rounded-2xl flex gap-1 w-full mb-6">
              <button 
                onClick={() => setInstallTab('android')}
                className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${installTab === 'android' ? 'bg-white text-emerald-700 shadow-md scale-102' : 'text-gray-600 hover:text-gray-800'}`}
              >
                أندرويد 🤖
              </button>
              <button 
                onClick={() => setInstallTab('ios')}
                className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${installTab === 'ios' ? 'bg-white text-emerald-700 shadow-md scale-102' : 'text-gray-600 hover:text-gray-800'}`}
              >
                آيفون / آيباد 🍎
              </button>
              <button 
                onClick={() => setInstallTab('pc')}
                className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${installTab === 'pc' ? 'bg-white text-emerald-700 shadow-md scale-102' : 'text-gray-600 hover:text-gray-800'}`}
              >
                الكمبيوتر 💻
              </button>
            </div>

            {/* TAB: Android */}
            {installTab === 'android' && (
              <div className="space-y-4 text-right mb-6 animate-fade-in">
                <p className="text-gray-700 font-bold mb-4 text-sm sm:text-base text-center leading-relaxed">
                  خطوات تثبيت التطبيق على هواتف أندرويد (رينو، سامسونج، شاومي إلخ):
                </p>
                <div className="flex items-start gap-3">
                  <span className="bg-secondary text-white font-black w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">١</span>
                  <p className="text-sm font-bold text-gray-800">
                    افتح المنصة من خلال متصفح <span className="text-primary font-black">Google Chrome</span> على هاتفك.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-secondary text-white font-black w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">٢</span>
                  <p className="text-sm font-bold text-gray-800">
                    اضغط على رمز الخيارات <i className="fas fa-ellipsis-v text-primary mx-1 text-base"></i> (النقاط الثلاث) في أعلى يسار الشاشة.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-secondary text-white font-black w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">٣</span>
                  <p className="text-sm font-bold text-gray-800">
                    اختر <span className="text-primary font-black">"تثبيت التطبيق" (Install App)</span> أو "التبويت إلى الشاشة الرئيسية" وسيظهر كأيقونة على هاتفك كأي تطبيق حقيقي سريع!
                  </p>
                </div>
              </div>
            )}

            {/* TAB: iOS */}
            {installTab === 'ios' && (
              <div className="space-y-4 text-right mb-6 animate-fade-in">
                <p className="text-gray-700 font-bold mb-4 text-sm sm:text-base text-center leading-relaxed">
                  خطوات تثبيت التطبيق على أجهزة الآيفون والآيباد:
                </p>
                <div className="flex items-start gap-3">
                  <span className="bg-secondary text-white font-black w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">١</span>
                  <p className="text-sm font-bold text-gray-800">
                    اضغط على زر المشاركة <i className="fas fa-share-square text-primary mx-1 text-base"></i> في أسفل شاشة متصفح Safari.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-secondary text-white font-black w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">٢</span>
                  <p className="text-sm font-bold text-gray-800">
                    قم بالتمرير لأسفل القائمة واضغط على <span className="text-primary font-black">"إضافة إلى الشاشة الرئيسية"</span> (Add to Home Screen).
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-secondary text-white font-black w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">٣</span>
                  <p className="text-sm font-bold text-gray-800">
                    اضغط على كلمة "إضافة" (Add) في أعلى اليسار لتثبيت التطبيق بنجاح!
                  </p>
                </div>
              </div>
            )}

            {/* TAB: Computer */}
            {installTab === 'pc' && (
              <div className="space-y-4 text-right mb-6 animate-fade-in">
                <p className="text-gray-700 font-bold mb-4 text-sm sm:text-base text-center leading-relaxed">
                  خطوات تثبيت التطبيق على الكمبيوتر (ويندوز أو ماك):
                </p>
                <div className="flex items-start gap-3">
                  <span className="bg-secondary text-white font-black w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">١</span>
                  <p className="text-sm font-bold text-gray-800">
                    افتح المنصة من خلال متصفح <span className="text-primary font-black">Google Chrome</span> أو <span className="text-primary font-black">Microsoft Edge</span> على حاسوبك.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-secondary text-white font-black w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">٢</span>
                  <p className="text-sm font-bold text-gray-800">
                    اضغط على زر التثبيت الصغير <i className="fas fa-plus-circle text-primary mx-1 text-base animate-pulse"></i> (أو السهم لأسفل) الذي يظهر في شريط العنوان (URL bar) بالجهة اليسرى/اليمنى بجوار النجمة.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-secondary text-white font-black w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">٣</span>
                  <p className="text-sm font-bold text-gray-800">
                    اضغط على <span className="text-primary font-black">"تثبيت" (Install)</span> وسيظهر البرنامج فوراً بأيقونة واضحة على سطح المكتب الخاص بك ليفتح بشكل سريع ومستقل!
                  </p>
                </div>
              </div>
            )}

            <button 
              onClick={() => setShowIOSInstallGuide(false)} 
              className="w-full bg-primary text-white font-black text-lg py-3 rounded-xl hover:bg-gray-900 transition-colors shadow-md cursor-pointer"
            >
              فهمت، شكراً 👍
            </button>
          </div>
        </div>
      )}

      {/* Global Background Audio Handler (hidden HTML5 Audio tag) */}
      <audio
        ref={globalAudioRef}
        src={globalAudio ? getDriveDirectLink(globalAudio.url) : undefined}
        onPlay={() => setIsGlobalAudioPlaying(true)}
        onPause={() => setIsGlobalAudioPlaying(false)}
        onEnded={() => {
          setIsGlobalAudioPlaying(false);
          setGlobalAudio(null);
        }}
        onTimeUpdate={handleGlobalAudioTimeUpdate}
         onLoadedMetadata={handleGlobalAudioLoadedMetadata}
        className="hidden"
        preload="auto"
      />

      {/* Global Background Audio Floating Control Bar */}
      {globalAudio && (
        <div 
          className={`fixed bottom-0 left-0 right-0 md:bottom-4 md:left-auto md:right-4 rounded-t-2xl md:rounded-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] md:shadow-[0_10px_40px_rgba(0,0,0,0.12)] z-[9999] animate-fade-in flex flex-col justify-between border-t md:border ${isDarkMode ? 'bg-gray-900/95 border-gray-800 text-white' : 'bg-white/95 border-blue-50 text-gray-800'} backdrop-blur-md`} 
          style={{
            marginTop: '0px',
            marginLeft: '0px',
            marginRight: '6px',
            paddingTop: '5px',
            paddingBottom: '16px',
            paddingRight: '25px',
            paddingLeft: '17px',
            width: '340px',
            height: '82px',
            marginBottom: '4px'
          }}
          dir="rtl"
        >
          <div className="flex items-center justify-between gap-2.5">
            <div 
              className="flex items-center gap-2 overflow-hidden max-w-[190px]"
              style={{
                paddingRight: '10px',
                paddingLeft: '10px',
                paddingTop: '4px',
                paddingBottom: '5px',
                marginLeft: '-1px',
                marginRight: '-40px'
              }}
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <i className={`fas fa-headphones-alt text-sm ${isGlobalAudioPlaying ? 'animate-bounce' : ''}`}></i>
              </div>
              <div className="overflow-hidden flex flex-col min-w-0">
                <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider shrink-0 leading-tight">شرح مسموع في الخلفية 🎧</p>
                <div className="overflow-hidden w-full whitespace-nowrap">
                  <p className={`text-xs font-black whitespace-nowrap inline-block ${isGlobalAudioPlaying ? 'animate-lesson-reveal' : 'truncate'}`}>
                    {globalAudio.title}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
              <a 
                href={getDriveDirectLink(globalAudio.url)} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-7 h-7 rounded-full bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center transition-colors cursor-pointer text-xs"
                title="فتح في متصفح خارجي"
              >
                <i className="fas fa-external-link-alt"></i>
              </a>
              <button 
                onClick={toggleGlobalAudio} 
                className="w-7 h-7 rounded-full bg-blue-50 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-colors cursor-pointer text-xs"
                title={isGlobalAudioPlaying ? "إيقاف مؤقت" : "تشغيل"}
                style={{
                  marginRight: '1px',
                  marginBottom: '-1px',
                  marginTop: '0px',
                  marginLeft: '3px'
                }}
              >
                <i className={`fas ${isGlobalAudioPlaying ? 'fa-pause' : 'fa-play'}`}></i>
              </button>
              <button 
                onClick={() => {
                  if (globalAudioRef.current) {
                    globalAudioRef.current.pause();
                  }
                  setGlobalAudio(null);
                  setIsGlobalAudioPlaying(false);
                }} 
                className="w-7 h-7 rounded-full bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center transition-colors cursor-pointer text-xs"
                title="إغلاق تماماً"
                style={{
                  marginLeft: '35px'
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
          
          {/* Progress bar controller */}
          <div className="flex items-center gap-2 px-0.5 leading-none">
            <span className="text-[9px] font-bold text-gray-500 w-7 text-left" dir="ltr">{formatAudioTime(globalAudioTime)}</span>
            <input 
              type="range" 
              min={0} 
              max={globalAudioDuration || 100} 
              value={globalAudioTime} 
              onChange={handleGlobalAudioSeek} 
              className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-[9px] font-bold text-gray-500 w-7 text-right" dir="ltr">{formatAudioTime(globalAudioDuration)}</span>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}
