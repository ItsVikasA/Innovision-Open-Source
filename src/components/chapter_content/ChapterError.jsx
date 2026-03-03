import React from "react";
import { AlertTriangle, Clock, RefreshCw, ServerCrash, WifiOff } from "lucide-react";

const getErrorDetails = (error) => {
    if (!error) return { icon: AlertTriangle, title: "Something went wrong", color: "text-red-500" };

    const lowerError = error.toLowerCase();

    if (lowerError.includes("timed out") || lowerError.includes("taking too long")) {
        return {
            icon: Clock,
            title: "Generation Timed Out",
            color: "text-amber-500",
            suggestion: "The AI took too long to generate this chapter. This can happen with complex topics. Please try again.",
        };
    }

    if (lowerError.includes("parse") || lowerError.includes("json") || lowerError.includes("valid json")) {
        return {
            icon: ServerCrash,
            title: "Content Processing Error",
            color: "text-orange-500",
            suggestion: "The generated content could not be processed correctly. Trying again usually resolves this.",
        };
    }

    if (lowerError.includes("save") || lowerError.includes("database") || lowerError.includes("lost during processing")) {
        return {
            icon: ServerCrash,
            title: "Storage Error",
            color: "text-red-500",
            suggestion: "The chapter was generated but could not be saved. Please try again.",
        };
    }

    if (lowerError.includes("network") || lowerError.includes("fetch") || lowerError.includes("status")) {
        return {
            icon: WifiOff,
            title: "Connection Error",
            color: "text-blue-500",
            suggestion: "There was a problem connecting to the server. Check your internet connection and try again.",
        };
    }

    return {
        icon: AlertTriangle,
        title: "Chapter Generation Failed",
        color: "text-red-500",
        suggestion: "Something went wrong while generating this chapter. Please try again.",
    };
};

const ChapterError = ({ fetchChapter, error }) => {
    const { icon: Icon, title, color, suggestion } = getErrorDetails(error);

    return (
        <div className="min-h-screen bg-background p-6 flex items-center justify-center">
            <div className="text-center max-w-md">
                <div className={`flex justify-center mb-4 ${color}`}>
                    <Icon className="h-12 w-12" />
                </div>
                <h2 className="text-2xl font-bold mb-2">{title}</h2>
                <p className="text-muted-foreground mb-4">
                    {suggestion || error}
                </p>
                {error && suggestion && (
                    <p className="text-sm text-muted-foreground/70 mb-6 border rounded-md p-3 bg-muted/30">
                        Error details: {error}
                    </p>
                )}
                <button
                    onClick={() => fetchChapter()}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                </button>
            </div>
        </div>
    );
};

export default ChapterError;
