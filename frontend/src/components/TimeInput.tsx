import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function TimeInput({ value, onChange }: TimeInputProps) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary">
        <Clock className="h-5 w-5" />
      </div>
      <Input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-12 h-14 text-base bg-card border-border focus:border-primary focus:ring-primary transition-colors"
      />
    </div>
  );
}
