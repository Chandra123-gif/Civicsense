import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

// Check for browser support
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export function useVoiceInput() {
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        setIsSupported(!!SpeechRecognition);
    }, []);

    const startListening = useCallback((onResult: (text: string) => void, continuous = false) => {
        if (!SpeechRecognition) {
            setError('Voice input is not supported in this browser');
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognitionRef.current = recognition;

            recognition.continuous = continuous;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                setIsListening(true);
                setError(null);
            };

            recognition.onresult = (event: any) => {
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                const currentTranscript = finalTranscript || interimTranscript;
                setTranscript(currentTranscript);

                if (finalTranscript) {
                    onResult(finalTranscript);
                }
            };

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                if (event.error === 'not-allowed') {
                    setError('Microphone access denied. Please allow microphone access.');
                } else if (event.error === 'no-speech') {
                    setError('No speech detected. Please try again.');
                } else {
                    setError(`Error: ${event.error}`);
                }
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.start();
        } catch (err) {
            console.error('Failed to start speech recognition:', err);
            setError('Failed to start voice input');
        }
    }, []);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, []);

    const toggleListening = useCallback((onResult: (text: string) => void) => {
        if (isListening) {
            stopListening();
        } else {
            startListening(onResult);
        }
    }, [isListening, startListening, stopListening]);

    return {
        isListening,
        isSupported,
        transcript,
        error,
        startListening,
        stopListening,
        toggleListening,
        clearTranscript: () => setTranscript(''),
    };
}

// Voice Input Button Component
export function VoiceInputButton({
    onTranscript,
    disabled = false,
    className = '',
}: VoiceInputProps) {
    const { isListening, isSupported, error, toggleListening } = useVoiceInput();

    if (!isSupported) {
        return null; // Don't show button if not supported
    }

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => toggleListening(onTranscript)}
                disabled={disabled}
                className={`p-2 rounded-lg transition-all ${isListening
                        ? 'bg-red-100 text-red-600 animate-pulse'
                        : 'bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
                title={isListening ? 'Stop recording' : 'Start voice input'}
            >
                {isListening ? (
                    <div className="relative">
                        <MicOff className="w-5 h-5" />
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                    </div>
                ) : (
                    <Mic className="w-5 h-5" />
                )}
            </button>
            {error && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded whitespace-nowrap">
                    {error}
                </div>
            )}
        </div>
    );
}

// Inline Voice Input with Visual Feedback
export function VoiceInputInline({
    value,
    onChange,
    placeholder,
    maxLength,
    rows = 1,
    disabled = false,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    maxLength?: number;
    rows?: number;
    disabled?: boolean;
}) {
    const { isListening, isSupported, transcript, toggleListening, clearTranscript } = useVoiceInput();
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleVoiceResult = useCallback((text: string) => {
        const newValue = localValue ? `${localValue} ${text}` : text;
        const trimmedValue = maxLength ? newValue.slice(0, maxLength) : newValue;
        setLocalValue(trimmedValue);
        onChange(trimmedValue);
        clearTranscript();
    }, [localValue, maxLength, onChange, clearTranscript]);

    const InputComponent = rows > 1 ? 'textarea' : 'input';

    return (
        <div className="relative">
            <InputComponent
                value={localValue}
                onChange={(e: any) => {
                    setLocalValue(e.target.value);
                    onChange(e.target.value);
                }}
                placeholder={placeholder}
                maxLength={maxLength}
                rows={rows > 1 ? rows : undefined}
                disabled={disabled}
                className={`input pr-12 ${rows > 1 ? 'resize-none' : ''} ${isListening ? 'ring-2 ring-red-400 border-red-300' : ''
                    }`}
            />

            {/* Voice Button */}
            {isSupported && (
                <button
                    type="button"
                    onClick={() => toggleListening(handleVoiceResult)}
                    disabled={disabled}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${isListening
                            ? 'bg-red-100 text-red-600'
                            : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={isListening ? 'Stop recording' : 'Voice input'}
                >
                    {isListening ? (
                        <div className="relative">
                            <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                    ) : (
                        <Mic className="w-4 h-4" />
                    )}
                </button>
            )}

            {/* Live Transcript Preview */}
            {isListening && transcript && (
                <div className="absolute left-0 right-0 -bottom-8 text-xs text-gray-500 italic truncate bg-blue-50 px-2 py-1 rounded">
                    🎤 {transcript}...
                </div>
            )}
        </div>
    );
}
