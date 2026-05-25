import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LogOut } from "lucide-react";
const Logout = ({ onConfirm }) => {
    return (
        <AlertDialog>
            <AlertDialogTrigger aria-label="Logout" className="hover:bg-accent rounded-md transistion cursor-pointer py-2 px-3 hover:text-accent-foreground">
                <LogOut className="w-4" aria-hidden="true"></LogOut>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure ?</AlertDialogTitle>
                    <AlertDialogDescription>
                        You will be logged out from your current session.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className={"bg-destructive text-zinc-50"} onClick={onConfirm}>
                        Logout
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default Logout;
