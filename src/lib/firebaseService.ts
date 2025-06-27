
// src/lib/firebaseService.ts
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged as firebaseOnAuthStateChanged, 
    signOut as firebaseSignOut,
    User as FirebaseUser
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    addDoc, 
    collection, 
    query, 
    orderBy, 
    limit, 
    getDocs,
    serverTimestamp,
    updateDoc,
    where,
    Timestamp,
    deleteDoc,
} from 'firebase/firestore';
import type { UserProfile, VitalSign, VitalSignFormData, UserProfileFormData, VitalSignsForAI, AlertLog, EnvironmentalData, PredictInitialProfileRiskOutput, Appointment, AppointmentFormData, Medication, MedicationFormData, MedicationLog, GeneratePersonalizedRecommendationsOutput, GeneratePersonalizedRecommendationsInput } from '@/types';
import { predictEarlyRisks as predictEarlyRisksAI } from '@/ai/flows/predict-early-risks';
import { assessInitialProfileRisk as assessInitialProfileRiskAI } from '@/ai/flows/predict-initial-profile-risk';
import { generatePersonalizedRecommendations as generatePersonalizedRecommendationsAI } from '@/ai/flows/generate-personalized-recommendations';


const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// --- Auth ---

export const onAuthStateChanged = (callback: (user: UserProfile | null) => void): (() => void) => {
  return firebaseOnAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    if (user) {
      // User is signed in, get their profile
      try {
        const profile = await getUserProfile(user.uid);
        callback(profile);
      } catch (error) {
        console.error("Error fetching user profile on auth state change:", error);
        // Fallback to a minimal profile to prevent app crash
        callback({ id: user.uid, email: user.email, name: user.displayName || user.email?.split('@')[0] });
      }
    } else {
      // User is signed out
      callback(null);
    }
  });
};


export const signUp = async (email: string, password?: string, name?: string, role?: 'patient' | 'caregiver'): Promise<UserProfile> => {
    if (!password) throw new Error("Password is required for sign up.");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    const userProfile: UserProfile = {
        id: user.uid,
        email: user.email,
        name: name || user.email?.split('@')[0],
        role: role || 'patient',
    };

    await updateUserProfile(user.uid, userProfile);
    
    return userProfile;
};


export const signIn = async (email: string, password?: string): Promise<UserProfile> => {
    if (!password) throw new Error("Password is required for sign in.");
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await getUserProfile(userCredential.user.uid);
    if (!profile) {
        throw new Error("User profile not found.");
    }
    return profile;
};

export const signOut = async (): Promise<void> => {
  await firebaseSignOut(auth);
};

// --- User Profile (Firestore) ---

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as UserProfile;
  } else {
    // This could happen if a user is created in Auth but their Firestore doc creation fails
    // Or if we are trying to access a profile that doesn't exist.
    console.warn(`No profile document found for user ID: ${userId}`);
    return null;
  }
};


export const updateUserProfile = async (userId: string, data: Partial<UserProfileFormData>): Promise<void> => {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, data, { merge: true });
};

// --- Vital Signs (Firestore) ---

export const addVitalSign = async (userId: string, data: VitalSignFormData): Promise<VitalSign> => {
    const vitalsCollectionRef = collection(db, 'users', userId, 'vitalSigns');
    const newDocData = {
        ...data,
        timestamp: serverTimestamp(),
    };
    const docRef = await addDoc(vitalsCollectionRef, newDocData);
    
    const docSnap = await getDoc(docRef);
    const docData = docSnap.data();

    return {
        ...data,
        id: docRef.id,
        userId,
        timestamp: (docData?.timestamp as Timestamp)?.toMillis() || Date.now(),
    };
};

export const getVitalSignsHistory = async (userId: string, limitCount: number = 20): Promise<VitalSign[]> => {
    const vitalsCollectionRef = collection(db, 'users', userId, 'vitalSigns');
    const q = query(vitalsCollectionRef, orderBy('timestamp', 'desc'), limit(limitCount));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: (doc.data().timestamp as Timestamp).toMillis()
    })) as VitalSign[];
};

export const getLatestVitalSign = async (userId: string): Promise<VitalSign | null> => {
    const vitalsCollectionRef = collection(db, 'users', userId, 'vitalSigns');
    const q = query(vitalsCollectionRef, orderBy('timestamp', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return null;
    }

    const docData = querySnapshot.docs[0];
    return {
        id: docData.id,
        ...docData.data(),
        timestamp: (docData.data().timestamp as Timestamp).toMillis()
    } as VitalSign;
};

// --- Environmental Data Simulation ---
export const fetchEnvironmentalData = async (latitude?: number, longitude?: number): Promise<EnvironmentalData> => {
  await new Promise(resolve => setTimeout(resolve, 700));

  let altitude: number;
  if (latitude && longitude && latitude > -12.5 && latitude < -11.5 && longitude > -75.5 && longitude < -74.5) {
    altitude = 3200 + Math.floor(Math.random() * 100); 
  } else {
    altitude = 50 + Math.floor(Math.random() * 300); 
  }
  
  const stepsToday = Math.floor(Math.random() * 8001);

  return { latitude, longitude, altitude, stepsToday };
};


// --- AI Risk Prediction Helpers ---

function formatPatientDescriptionForAI(profile: UserProfile | null): string {
  if (!profile) return "No hay datos del paciente disponibles.";
  let description = `Paciente: ${profile.name || 'N/A'}.`;
  if (profile.age) description += ` Edad: ${profile.age}.`;
  if (profile.sex) description += ` Sexo: ${profile.sex}.`;
  if (profile.medicalDiagnosis) description += ` Diagnóstico médico: ${profile.medicalDiagnosis}.`;
  if (profile.currentMedications) description += ` Medicamentos actuales: ${profile.currentMedications}.`;
  if (description === `Paciente: ${profile.name || 'N/A'}.`) return "Perfil del paciente con información limitada.";
  return description;
}

export const predictEarlyRisks = async (
  userId: string,
  currentVitals?: VitalSignsForAI,
  environmentalData?: EnvironmentalData
) => {
  const userProfile = await getUserProfile(userId);
  const patientDescription = formatPatientDescriptionForAI(userProfile);

  let vitalsToUse = currentVitals;
  if (!vitalsToUse) {
    const latestVital = await getLatestVitalSign(userId);
    if (latestVital) {
      vitalsToUse = {
        heartRate: latestVital.heartRate,
        systolicPressure: latestVital.systolicPressure,
        oxygenSaturation: latestVital.oxygenSaturation,
        temperature: latestVital.temperature,
      };
    }
  }

  const inputForAI: {
    vitalSigns?: VitalSignsForAI;
    patientDescription: string;
    environmentalData?: EnvironmentalData;
  } = { patientDescription };

  if (vitalsToUse) inputForAI.vitalSigns = vitalsToUse;
  if (environmentalData) inputForAI.environmentalData = environmentalData;

  try {
    return await predictEarlyRisksAI(inputForAI);
  } catch (error) {
    console.error("Error en la Predicción de Riesgos (detallada) por IA:", error);
    return {
      riskAssessment: "Error al realizar la evaluación de riesgos detallada.",
      recommendations: "Por favor, inténtelo de nuevo más tarde o contacte con soporte si el problema persiste.",
    };
  }
};


export const predictInitialProfileRisk = async (userId: string): Promise<PredictInitialProfileRiskOutput> => {
  const userProfile = await getUserProfile(userId);
  const patientDescription = formatPatientDescriptionForAI(userProfile);

  if (patientDescription === "No hay datos del paciente disponibles." || patientDescription === "Perfil del paciente con información limitada.") {
    return {
      riskLevel: 'Bajo',
      justification: "No hay suficiente información en el perfil para una evaluación de riesgo inicial detallada."
    };
  }

  try {
    return await assessInitialProfileRiskAI({ patientDescription });
  } catch (error) {
    console.error("Error en la Evaluación de Riesgo de Perfil Inicial por IA:", error);
    return {
      riskLevel: 'Medio',
      justification: "Error al procesar la evaluación de riesgo del perfil. Inténtelo más tarde."
    };
  }
};

export const generatePersonalizedRecommendations = async (userId: string): Promise<GeneratePersonalizedRecommendationsOutput> => {
  const userProfile = await getUserProfile(userId);
  const vitalHistory = await getVitalSignsHistory(userId, 15); // Get last 15 readings for trend analysis

  const patientDescription = formatPatientDescriptionForAI(userProfile);
  const inputForAI: GeneratePersonalizedRecommendationsInput = {
    patientDescription,
    vitalHistory: vitalHistory.map(v => ({
      timestamp: v.timestamp,
      heartRate: v.heartRate,
      systolicPressure: v.systolicPressure,
      oxygenSaturation: v.oxygenSaturation,
      temperature: v.temperature,
    }))
  };

  try {
    return await generatePersonalizedRecommendationsAI(inputForAI);
  } catch (error) {
    console.error("Error al generar recomendaciones personalizadas:", error);
    throw new Error("No se pudieron generar las recomendaciones. El asistente de IA puede estar experimentando problemas.");
  }
};



// --- Vital Alerts (Firestore) ---

export const logVitalAlert = async (
  userId: string,
  alertData: Omit<AlertLog, 'id' | 'userId' | 'timestamp' | 'status'>
): Promise<string> => {
    const alertsCollectionRef = collection(db, 'users', userId, 'alerts');
    const newAlertData = {
        ...alertData,
        timestamp: serverTimestamp(),
        status: 'active'
    };
    const docRef = await addDoc(alertsCollectionRef, newAlertData);
    return docRef.id;
};

export const getVitalAlertsHistory = async (userId: string, limitCount: number = 20): Promise<AlertLog[]> => {
    const alertsCollectionRef = collection(db, 'users', userId, 'alerts');
    const q = query(alertsCollectionRef, orderBy('timestamp', 'desc'), limit(limitCount));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: (doc.data().timestamp as Timestamp).toMillis()
    })) as AlertLog[];
};

// --- Caregiver Functions ---

export const getAllPatients = async (): Promise<UserProfile[]> => {
    const usersCollectionRef = collection(db, 'users');
    const q = query(usersCollectionRef, where('role', '==', 'patient'));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return [];
    }

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as UserProfile[];
};


// --- Schedule / Appointments ---

export const addAppointment = async (userId: string, data: AppointmentFormData): Promise<Appointment> => {
    const appointmentsCollectionRef = collection(db, 'users', userId, 'appointments');
    const newDocData = {
        ...data,
        createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(appointmentsCollectionRef, newDocData);
    const docSnap = await getDoc(docRef);
    const docData = docSnap.data();

    return {
        ...data,
        id: docRef.id,
        userId,
        createdAt: (docData?.createdAt as Timestamp)?.toMillis() || Date.now(),
    } as Appointment;
};

export const getAppointments = async (userId: string): Promise<Appointment[]> => {
    const appointmentsCollectionRef = collection(db, 'users', userId, 'appointments');
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    // Convert today's date to a Firestore timestamp for the query
    const todayTimestamp = Timestamp.fromDate(today);

    // Simplified query to avoid requiring a composite index.
    // The client will handle the secondary sort by time.
    const q = query(
        appointmentsCollectionRef, 
        where('date', '>=', todayTimestamp.toMillis()), 
        orderBy('date', 'asc')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        userId,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp).toMillis()
    })) as Appointment[];
};

// --- Medications ---

export const addMedication = async (userId: string, data: MedicationFormData): Promise<Medication> => {
    const medCollectionRef = collection(db, 'users', userId, 'medications');
    const newDocData = {
        ...data,
        createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(medCollectionRef, newDocData);
    const docSnap = await getDoc(docRef);
    const docData = docSnap.data();

    return {
        ...data,
        id: docRef.id,
        userId,
        createdAt: (docData?.createdAt as Timestamp)?.toMillis() || Date.now(),
    } as Medication;
};

export const getMedications = async (userId: string): Promise<Medication[]> => {
    const medCollectionRef = collection(db, 'users', userId, 'medications');
    const q = query(medCollectionRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp).toMillis()
    })) as Medication[];
};

export const deleteMedication = async (userId: string, medicationId: string): Promise<void> => {
    const medDocRef = doc(db, 'users', userId, 'medications', medicationId);
    await deleteDoc(medDocRef);
};

export const logMedicationTaken = async (userId: string, medicationId: string, medicationName: string): Promise<string> => {
    const logCollectionRef = collection(db, 'users', userId, 'medicationLog');
    const newLogData = {
        medicationId,
        medicationName,
        takenAt: serverTimestamp(),
    };
    const docRef = await addDoc(logCollectionRef, newLogData);
    return docRef.id;
};

export const getMedicationLog = async (userId: string, limitCount: number = 50): Promise<MedicationLog[]> => {
    const logCollectionRef = collection(db, 'users', userId, 'medicationLog');
    const q = query(logCollectionRef, orderBy('takenAt', 'desc'), limit(limitCount));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        takenAt: (doc.data().takenAt as Timestamp).toMillis()
    })) as MedicationLog[];
};
