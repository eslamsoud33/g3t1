export const API_URL = "https://script.google.com/macros/s/AKfycbwux5P_M5KT9GueWp1s0I7uzaHT8Qjy9xKTrqaVnEl7O3vgwkWekSb8LQKIwnH98Umuow/exec"; 
export const SECRET_API_KEY = "Kanz_Secret_2026_Secure";

export interface StudentBase {
  role: string;
  name: string;
  passHash: string;
}

export const BASE_STUDENTS: Record<string, StudentBase> = {
  "01228466613": { role: "admin", name: "eslam", passHash: "343432303034" }, // 442004
  "01205058940": { role: "secretary", name: "mostafa", passHash: "30" } // 0
};

export const subjectName = "دراسات اجتماعية";
export const gradeName = "الصف الثالث الإعدادي";
export const PAYMENT_INFO = { fee: "50 جنيهاً", vodafoneCash: "01228466613", instapay: "01228466613" };

export const simpleHash = (str: string): string => {
  if (!str) return '';
  let hex = '';
  for(let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16);
  }
  return hex;
};

export const toEasternArabic = (num: string | number): string => {
  return String(num).split('').map(digit => {
    const arabDigits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
    const idx = parseInt(digit, 10);
    return !isNaN(idx) ? arabDigits[idx] : digit;
  }).join('');
};

export const formatPhoneStr = (phone: string): string => {
  if (!phone) return "";
  let cleaned = String(phone).replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[\s\+\.]/g, "");
  if (cleaned.startsWith("20") && cleaned.length > 10) cleaned = cleaned.substring(2);
  if (cleaned.length === 10 && cleaned.startsWith("1")) cleaned = "0" + cleaned;
  return cleaned;
};

export const generateDeviceFingerprint = (): string => {
  try {
    const canvas = document.createElement('canvas'); 
    const ctx = canvas.getContext('2d');
    if (!ctx) return Math.random().toString(16).substring(2, 10);
    ctx.textBaseline = "top"; 
    ctx.font = "14px 'Arial'"; 
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60"; 
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069"; 
    ctx.fillText("EdTech-Fingerprint", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)"; 
    ctx.fillText("EdTech-Fingerprint", 4, 17);
    const b64 = canvas.toDataURL().replace("data:image/png;base64,","");
    const bin = atob(b64);
    
    const crc32 = function(r: string): number {
      const o: number[] = [];
      for (let c = 0; c < 256; c++) {
        let a = c;
        for (let f = 0; f < 8; f++) {
          a = 1 & a ? 3988292384 ^ (a >>> 1) : a >>> 1;
        }
        o[c] = a;
      }
      let n = -1;
      for (let t = 0; t < r.length; t++) {
        n = (n >>> 8) ^ o[255 & (n ^ r.charCodeAt(t))];
      }
      return (-1 ^ n) >>> 0;
    };
    
    return crc32(bin).toString(16);
  } catch (e) {
    return Math.random().toString(16).substring(2, 10);
  }
};

export const getDriveDirectLink = (url: string): string => {
  if (!url) return '';
  const driveRegex = /\/file\/d\/([a-zA-Z0-9_-]+)/;
  const idRegex = /id=([a-zA-Z0-9_-]+)/;
  let fileId: string | null = null;
  const driveMatch = url.match(driveRegex);
  const idMatch = url.match(idRegex);
  if (driveMatch) fileId = driveMatch[1];
  else if (idMatch) fileId = idMatch[1];
  
  if (fileId) {
    // Detect if we are running on Cloud Run preview or standard localhost development server
    const isLocalOrPreview = 
      window.location.hostname.includes('run.app') || 
      window.location.hostname.includes('localhost') || 
      window.location.hostname === '127.0.0.1';

    if (isLocalOrPreview) {
      return `/api/proxy-audio?id=${fileId}`;
    } else {
      // Direct stream fallback for static hosting (Netlify, GitHub Pages, or bundled Mobile App)
      return `https://docs.google.com/uc?export=download&id=${fileId}`;
    }
  }
  return url;
};

export const getYoutubeEmbedLink = (url: string): string => {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) return `https://www.youtube.com/embed/${match[2]}`;
  return url;
};
