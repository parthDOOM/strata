/**
 * Dark/Light mode toggle button.
 *
 * Cycles through: light -> dark -> system -> light
 */

import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export function ModeToggle() {
    const { theme, setTheme } = useTheme();

    const cycleTheme = () => {
        if (theme === "light") {
            setTheme("dark");
        } else if (theme === "dark") {
            setTheme("system");
        } else {
            setTheme("light");
        }
    };

    const getIcon = () => {
        switch (theme) {
            case "light":
                return <Sun className="h-4 w-4" />;
            case "dark":
                return <Moon className="h-4 w-4" />;
            default:
                return <Monitor className="h-4 w-4" />;
        }
    };

    const getLabel = () => {
        switch (theme) {
            case "light":
                return "Light";
            case "dark":
                return "Dark";
            default:
                return "System";
        }
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={cycleTheme}
            className="gap-2"
        >
            {getIcon()}
            <span className="hidden sm:inline">{getLabel()}</span>
        </Button>
    );
}
