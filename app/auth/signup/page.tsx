
import { Background } from "@/components/Background";
import { Auth } from "@/components/Auth";

export default function SignupPage() {
    return (
        <div className="min-h-screen flex items-center justify-center relative p-4">
            <Background />
            <Auth initialView="signup" />
        </div>
    )
}
