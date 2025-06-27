
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceInputButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  onTranscript: (text: string) => void;
  onListeningChange?: (isListening: boolean) => void;
  lang?: string;
  targetInputName?: string; // For user feedback
  "aria-label"?: string; // Explicit aria-label prop
}

const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscript,
  onListeningChange,
  lang = 'es-ES',
  disabled,
  className,
  targetInputName,
  "aria-label": ariaLabelProp,
  ...props
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true); // Assume supported initially
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check for SpeechRecognition API only on client-side
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) {
        setIsSupported(false);
        console.warn("Speech Recognition API no está soportada en este navegador.");
        return;
      }

      try {
        const recognitionInstance = new SpeechRecognitionAPI();
        recognitionInstance.continuous = false; // We want single utterances for form fields
        recognitionInstance.interimResults = false; // We only care about the final result
        recognitionInstance.lang = lang;

        recognitionInstance.onstart = () => {
          console.log('VoiceInputButton - Reconocimiento iniciado.');
          setIsListening(true);
          onListeningChange?.(true);
        };

        recognitionInstance.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          console.log('VoiceInputButton - Transcripción recibida:', transcript);
          onTranscript(transcript);
        };

        recognitionInstance.onerror = (event) => {
          let errorMessage = "Error en el reconocimiento de voz.";
          // Common errors that have specific user-facing toasts
          const commonErrors = ['no-speech', 'audio-capture', 'not-allowed', 'network'];

          if (!commonErrors.includes(event.error)) {
            // Log only unexpected errors to the console
            console.error("Unexpected SpeechRecognition API error:", event.error, event.message);
          } else {
            // Still good to know in dev if common errors are happening frequently, but as a console.warn or .info
            console.warn("Handled SpeechRecognition API event:", event.error, event.message || '(No specific message)');
          }
          
          if (event.error === 'no-speech') {
            errorMessage = "No se detectó voz. Inténtelo de nuevo.";
          } else if (event.error === 'audio-capture') {
            errorMessage = "Error al capturar audio. Verifique su micrófono.";
          } else if (event.error === 'not-allowed') {
            errorMessage = "Permiso para usar el micrófono denegado. Por favor, habilite el acceso al micrófono en la configuración de su navegador.";
          } else if (event.error === 'network') {
            errorMessage = "Error de red durante el reconocimiento de voz. Verifique su conexión a internet.";
          }
          
          toast({
            title: "Error de Voz",
            description: errorMessage,
            variant: "destructive",
          });
          setIsListening(false); // Ensure listening state is reset
          onListeningChange?.(false);
        };

        recognitionInstance.onend = () => {
          console.log('VoiceInputButton - Reconocimiento finalizado.');
          setIsListening(false);
          onListeningChange?.(false);
        };
        recognitionRef.current = recognitionInstance;
      } catch (e) {
        console.error("Error al instanciar SpeechRecognition:", e);
        setIsSupported(false);
        toast({
            title: "Error de Voz",
            description: "No se pudo inicializar el servicio de reconocimiento de voz en su navegador.",
            variant: "destructive",
        });
        return;
      }

      return () => {
        if (recognitionRef.current) {
          console.log('VoiceInputButton - Abortando reconocimiento en cleanup.');
          recognitionRef.current.abort();
        }
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]); // onTranscript and onListeningChange should ideally be memoized if they cause re-runs

  const handleToggleListen = async () => {
    if (!isSupported) {
      toast({
        title: "Funcionalidad no Soportada",
        description: "El reconocimiento de voz no está disponible en su navegador.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        // Check and request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // It's good practice to stop the tracks immediately if you only need permission
        stream.getTracks().forEach(track => track.stop());
        
        recognitionRef.current?.start();
        if (targetInputName) {
          toast({
            title: "Escuchando...",
            description: `Hable ahora para el campo: ${targetInputName}`,
          });
        }
      } catch (err) {
        console.error("Error al acceder al micrófono:", err);
        let desc = "No se pudo acceder al micrófono. Por favor, verifique los permisos en la configuración de su navegador.";
        if (err instanceof Error && err.name === 'NotAllowedError') {
            desc = "Permiso para usar el micrófono denegado. Por favor, habilítelo en la configuración de su navegador.";
        }
        toast({
          title: "Error de Micrófono",
          description: desc,
          variant: "destructive",
        });
      }
    }
  };
  
  const defaultAriaLabel = isListening ? `Dejar de escuchar para ${targetInputName || 'entrada de voz'}` : `Comenzar a escuchar para ${targetInputName || 'entrada de voz'}`;
  
  // Render nothing or a disabled button if not supported and on server
  if (typeof window === 'undefined' && !isSupported) {
    return null; // Or a placeholder that doesn't rely on client-side state
  }

  if (!isSupported) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled
        className={className}
        title="Reconocimiento de voz no soportado"
        aria-label="Reconocimiento de voz no soportado en este navegador"
        {...props}
      >
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
      </Button>
    );
  }

  return (
    <Button
      type="button" // Important to prevent form submission
      variant={isListening ? "destructive" : "outline"}
      size="icon"
      onClick={handleToggleListen}
      disabled={disabled}
      className={className}
      title={ariaLabelProp || defaultAriaLabel} // Use title for tooltip
      aria-label={ariaLabelProp || defaultAriaLabel} // Explicit aria-label
      {...props}
    >
      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
};

export { VoiceInputButton };

