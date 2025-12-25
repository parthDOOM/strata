import { cn } from "@/lib/utils";

interface LogoProps extends React.SVGProps<SVGSVGElement> {
    className?: string;
}

export function Logo({ className, ...props }: LogoProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("h-6 w-6", className)}
            {...props}
        >
            <path d="M4 17l-2-5 2-5" className="text-slate-400" />
            <path d="M20 17l2-5-2-5" className="text-slate-400" />

            <path d="M9 10v6" className="text-red-500" strokeWidth="2" />
            <path d="M9 8v2" className="text-red-500" strokeWidth="1" />
            <path d="M9 16v2" className="text-red-500" strokeWidth="1" />

            <path d="M15 7v6" className="text-emerald-500" strokeWidth="2" />
            <path d="M15 5v2" className="text-emerald-500" strokeWidth="1" />
            <path d="M15 13v3" className="text-emerald-500" strokeWidth="1" />
        </svg>
    );
}
