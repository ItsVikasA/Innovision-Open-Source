import { Loader2 } from "lucide-react";
const Loading = () => {
    return (
        <div className="w-screen h-[calc(100vh-156px)] bg-background flex items-center justify-center">
            <Loader2 className="animate-spin ease-in-out"></Loader2>
        </div>
    );
};

export default Loading;
