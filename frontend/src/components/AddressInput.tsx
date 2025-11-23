import { Input } from "@/components/ui/input";
import { MapPin, Flag } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { fetchAutocomplete } from "@/api/peakroute";

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type: "start" | "destination";
}

export function AddressInput({ value, onChange, placeholder, type }: AddressInputProps) {
  const Icon = type === "start" ? MapPin : Flag;
  const iconColor = type === "start" ? "text-transit" : "text-transit-accent";
  
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef(false); // Track when user is selecting from dropdown

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Skip autocomplete if we're in the middle of selecting a suggestion
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      if (value.length > 2) {
        try {
          const results = await fetchAutocomplete(value);
          setSuggestions(results);
          setShowSuggestions(true);
        } catch (error) {
          console.error("Autocomplete error:", error);
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  const handleSelectSuggestion = (suggestion: string) => {
    isSelectingRef.current = true; // Set flag before updating value
    onChange(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className={`absolute left-4 top-1/2 -translate-y-1/2 ${iconColor} z-10`}>
        <Icon className="h-5 w-5" />
      </div>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-12 h-14 text-base bg-card border-border focus:border-primary focus:ring-primary transition-colors"
        autoComplete="off"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full text-left px-4 py-3 hover:bg-accent transition-colors text-sm"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
